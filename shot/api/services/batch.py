from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from services.analysis import AnalysisService
from models import BatchJob, BatchJobItemResult, BatchJobStatus, BatchJobSummary, ExpectedValues


@dataclass
class BatchFilePayload:
    file: str
    mime: str
    img: bytes

@dataclass
class BatchJobRecord:
    job: BatchJob
    files: list[BatchFilePayload]
    expected: ExpectedValues

class BatchProcessingService:
    def __init__(self, analysis: AnalysisService) -> None:
        self._analysis = analysis
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._jobs: dict[str, BatchJobRecord] = {}
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._worker())

    async def stop(self) -> None:
        if self._task is None:
            return

        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None

    def create(self, files: list[BatchFilePayload], expected: ExpectedValues) -> BatchJob:
        now = datetime.now(timezone.utc).isoformat()
        job_id = str(uuid.uuid4())
        items = [
            BatchJobItemResult(
                id=str(uuid.uuid4()),
                file=file.file,
                status=BatchJobStatus.QUEUED,
            )
            for file in files
        ]
        job = BatchJob(
            id=job_id,
            created=now,
            updated=now,
            status=BatchJobStatus.QUEUED,
            summary=BatchJobSummary(
                total=len(items),
                queued=len(items),
                processing=0,
                completed=0,
                failed=0,
            ),
            items=items,
        )
        self._jobs[job_id] = BatchJobRecord(job=job, files=files, expected=expected)
        self._queue.put_nowait(job_id)
        return job.model_copy(deep=True)

    def get(self, job_id: str) -> BatchJob | None:
        record = self._jobs.get(job_id)
        if record is None:
            return None
        return record.job.model_copy(deep=True)

    async def _worker(self) -> None:
        while True:
            job_id = await self._queue.get()
            record = self._jobs.get(job_id)
            if record is None:
                self._queue.task_done()
                continue

            try:
                await self._process_job(record)
            finally:
                self._queue.task_done()

    async def _process_job(self, record: BatchJobRecord) -> None:
        record.job.status = BatchJobStatus.PROCESSING
        self._touch(record.job)
        self._refresh_summary(record.job)

        for i, file in enumerate(record.files):
            item = record.job.items[i]
            item.status = BatchJobStatus.PROCESSING
            item.started = datetime.now(timezone.utc).isoformat()
            item.done = None
            item.elapsed = None
            self._touch(record.job)
            self._refresh_summary(record.job)

            start = time.perf_counter()
            try:
                out = await asyncio.to_thread(
                    self._analysis.analyze,
                    img=file.img,
                    mime=file.mime,
                    expected=record.expected,
                )
                item.result = out
                item.status = BatchJobStatus.COMPLETED
                item.error = None
                item.elapsed = out.elapsed
            except Exception as exc:
                item.status = BatchJobStatus.FAILED
                item.error = str(exc)
                item.elapsed = (time.perf_counter() - start) * 1000

            item.done = datetime.now(timezone.utc).isoformat()
            self._touch(record.job)
            self._refresh_summary(record.job)

        if record.job.summary.failed == record.job.summary.total:
            record.job.status = BatchJobStatus.FAILED
        else:
            record.job.status = BatchJobStatus.COMPLETED
        self._touch(record.job)
        self._refresh_summary(record.job)

    @staticmethod
    def _touch(job: BatchJob) -> None:
        job.updated = datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _refresh_summary(job: BatchJob) -> None:
        queued = sum(item.status == BatchJobStatus.QUEUED for item in job.items)
        processing = sum(item.status == BatchJobStatus.PROCESSING for item in job.items)
        completed = sum(item.status == BatchJobStatus.COMPLETED for item in job.items)
        failed = sum(item.status == BatchJobStatus.FAILED for item in job.items)
        job.summary = BatchJobSummary(
            total=len(job.items),
            queued=queued,
            processing=processing,
            completed=completed,
            failed=failed,
        )