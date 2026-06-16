# Post Mortem

## Overview

I approached this as a lightweight, fast-moving prototype intended to demonstrate implementation skill, architectural judgment, and UI polish under a short delivery timeline. The API is modular and centered on explicit models so the validation rules and data contracts can be adjusted later if regulations or business requirements change.

The structure of the API was influenced by the service-oriented architectural style I have used in ASP.NET Core applications. Given the time constraints, I chose not to use .NET for this build because standing up my normal production-oriented baseline would have introduced unnecessary overhead for a one-week prototype. Python and FastAPI allowed me to move quickly while still keeping the code organized in a way that could transfer cleanly to another stack later.

Python was selected primarily because it is well suited to rapid API prototyping and has a strong ecosystem for this problem space, including FastAPI, Pillow, and the OpenAI SDK. In hindsight, a .NET implementation would likely have provided better raw API performance, but the dominant latency in this project is the OCR call to the OpenAI API rather than the web framework itself.

The client was built with Next.js to keep the UI clean, structured, and easy to extend. I intentionally used componentized sections so the application can grow without requiring a redesign of the page structure. With more time, I would have introduced a dedicated core or design-system layer to separate reusable primitives from feature-specific UI.

Componentization and explicit models were the two main implementation priorities throughout the project. For a prototype, I optimized for a fast development stack without giving up basic architectural discipline.

I also pulled visual assets from official U.S. Treasury properties and aligned the styling direction with the main site to make the exercise feel more grounded in the real operating environment.

## Delivery Priorities

Given the short timeframe, I prioritized the API and the core MVP workflow first.

### Stage 1

- Upload label images
- OCR processing
- Parse fields from extracted text
- Display extracted values
- Capture expected values
- Compare extracted and expected values
- Verify the standard government warning
- Return pass, review, or fail outcomes

### Stage 2

- Performance optimization to target sub-five-second processing
- Processing status visibility
- Display timing metrics
- Intelligent matching:
  - Case-insensitive comparisons
  - Whitespace normalization
  - Fuzzy matching
  - Review-state highlighting for likely matches instead of treating every non-exact match as a hard failure

### Stage 3

- Batch label uploading for larger runs in the 200-300 label range referenced during interviews
- Display batch results
- Export results
- OCR improvements

### Stage 4

- Unit testing
- Public deployment of the API and client
- Batch processing for expected fields
- Post-mortem documentation

## Assumptions

The biggest assumption was that this was an MVP rather than a fully productionized system. As a result, the focus stayed on the core workflow in Stage 1 instead of broader platform features.

I also assumed a fairly standard label presentation: reasonably high contrast, readable text, and a surface condition that a multimodal model could interpret reliably. Ideally, I would have been given a broader set of real-world labels with more environmental variation. That said, I still tried to include some worst-case examples while testing.

I deliberately took an overly cautious approach to compliance decisions. The system is biased toward warnings and failures rather than false passes. That increases the number of labels requiring human review, but it materially reduces the risk of incorrectly approving a label. Even with manual review for flagged cases, the workload would still be significantly lower than a fully manual process.

I also assumed the user is comfortable with a basic web workflow, including navigating a browser and selecting image files from a local file system.

## API Writeup

The API was built with Python and FastAPI using a lightweight service-based structure intended to scale cleanly without becoming over-engineered for a prototype.

The main entry point, [shot/api/main.py](/d:/TreasuryInterviewAssignment/shot/api/main.py), acts as the routing and middleware layer. It configures CORS, loads environment settings, instantiates the core services, and exposes the HTTP endpoints for health checks, single-image analysis, and batch processing.

The shared domain contracts live in [shot/api/models.py](/d:/TreasuryInterviewAssignment/shot/api/models.py). These models define the extracted OCR fields, expected values, validation results, processing metrics, and batch job structures. Keeping these models centralized made the rest of the API easier to reason about and helped the client integration stay predictable.

Configuration is loaded from [shot/api/config/settings.py](/d:/TreasuryInterviewAssignment/shot/api/config/settings.py) and [shot/api/config/app.json](/d:/TreasuryInterviewAssignment/shot/api/config/app.json). This keeps model selection, thresholds, image-preprocessing settings, field definitions, and performance targets out of the implementation code.

I selected GPT-4o for OCR because it was inexpensive enough for a prototype while still producing usable results for the problem space. With a larger budget, I would test newer models for better OCR accuracy, but for this assignment the tradeoff between cost and quality was appropriate.

The code style emphasizes readability and straightforward control flow. I preferred small services with explicit responsibilities over deeper abstractions.

Render was chosen for API deployment because it was fast to stand up and easy to use for validation during development.

The validation test suite was generated with assistance from GPT-5.5 and then used to exercise the main use cases. The sample images in [test-images](/d:/TreasuryInterviewAssignment/test-images) and the associated manifest include generated examples plus some manually selected cases intended to push the edge conditions.

## API Technical Writeup

The API follows a composition-root plus service-layer design. At import time, [shot/api/main.py](/d:/TreasuryInterviewAssignment/shot/api/main.py) loads the OpenAI API key, builds singleton-style service instances for OCR, validation, analysis, and batch execution, and wires them into FastAPI route handlers. This keeps request handlers thin and pushes the actual business logic into testable service classes.

### Request Lifecycle

For single-image analysis, the `/api/analyze` endpoint accepts a multipart upload plus a JSON-encoded `expected` form field. The route deserializes the expected values into the `ExpectedValues` Pydantic model and reads the uploaded image into memory before passing both into `AnalysisService.analyze()`.

`AnalysisService` is the orchestration layer for request-time work. It enforces input constraints first by validating MIME type and file size against configuration values loaded from [shot/api/config/settings.py](/d:/TreasuryInterviewAssignment/shot/api/config/settings.py). Once the payload passes validation, it performs two timed stages:

1. OCR extraction through `OCRService`
2. Compliance evaluation through `ValidationService`

Those timings are attached to the response as stage metrics so the client can display operational visibility instead of returning only the final pass or fail outcome.

### OCR and Image Preprocessing Pipeline

The OCR path is deliberately split into preprocessing and extraction.

`OCRService.extract()` first delegates to `PreprocessingService` in [shot/api/services/processing.py](/d:/TreasuryInterviewAssignment/shot/api/services/processing.py). The preprocessing pipeline does the following in order:

1. Normalizes the image into RGB
2. Resizes the image down to a configured maximum dimension when needed
3. Applies autocontrast
4. Applies an additional contrast boost
5. Sharpens the image before JPEG re-encoding

Each preprocessing step produces a structured `OCRPreprocessingStep` entry that is returned to the client. That is an important architectural choice because it gives the UI an audit trail for how the image was transformed before OCR.

After preprocessing, `OCRService` base64-encodes the resulting image and sends it to the OpenAI Chat Completions API with a JSON-object response format. The OCR prompt, selected model, and image detail level all come from configuration rather than being hard-coded into the route layer.

The response handling is intentionally defensive. If the model returns no content or malformed JSON, the service falls back to an empty `ExtractedFields` object rather than failing the entire request. After deserialization, the service sanitizes extracted values by normalizing whitespace and verifying that each extracted field actually appears in the raw OCR text. That guards against hallucinated structured fields that are not supported by the underlying OCR output.

### Validation Engine Design

`ValidationService` in [shot/api/services/validation.py](/d:/TreasuryInterviewAssignment/shot/api/services/validation.py) is where domain evaluation happens. The service is configuration-driven for standard fields: it iterates over `fieldDefinitions` from the application settings rather than hard-coding every comparison directly in the request handler.

Each field is evaluated through a graduated matching strategy:

1. Missing field detection
2. Exact string comparison
3. Case and whitespace normalization
4. Punctuation stripping
5. Similarity scoring via `difflib.SequenceMatcher`

This produces a `FieldValidation` object with a compliance status, match type, score, details, reason, and recommended remediation text. Architecturally, that is useful because the API returns not only a verdict but also an explanation layer that the client can render for human review.

The government warning is treated as a specialized validation path rather than just another generic string field. It has its own model, `GovernmentWarningValidation`, and separate rules for presence, capitalization of `GOVERNMENT WARNING:`, and exact wording. That specialization is the right tradeoff here because the warning has materially different compliance semantics from the other extracted values.

### Batch Processing Architecture

Batch processing is implemented as an in-memory asynchronous queue in [shot/api/services/batch.py](/d:/TreasuryInterviewAssignment/shot/api/services/batch.py). The `BatchProcessingService` stores batch jobs in a process-local dictionary and uses an `asyncio.Queue` plus a background worker task that starts on FastAPI startup and stops on shutdown.

When a batch is submitted to `/api/batches`, the API reads each upload into memory, converts the files into `BatchFilePayload` records, creates a `BatchJob`, and enqueues the job identifier. The worker then processes each file sequentially, offloading the synchronous analysis path through `asyncio.to_thread()` so the event loop is not blocked by CPU-bound or network-bound work inside the analysis stack.

This is a pragmatic MVP design because it adds batch capability without introducing an external broker or job system. The tradeoff is that batch state is ephemeral and tied to the lifetime of the API process. A restart clears all in-memory jobs, and there is no horizontal scaling story for shared work coordination in the current implementation.

### Domain Modeling and Response Shape

The Pydantic models in [shot/api/models.py](/d:/TreasuryInterviewAssignment/shot/api/models.py) are the backbone of the API contract. The response shape is richer than a basic OCR response because it combines:

- Structured extracted fields
- Per-field compliance results
- Specialized government-warning validation
- End-to-end and per-stage timing metrics
- Raw OCR text
- Preprocessing audit steps
- Batch summaries and item-level status records

That modeling choice improves maintainability because the client can rely on stable, typed contracts and the API can evolve individual services without constantly reshaping the transport layer.

### Operational Characteristics and Tradeoffs

The critical performance bottleneck is the external OCR call, not the FastAPI framework itself. The API mitigates this partially by resizing images, reducing payload size, and exposing timing metrics for OCR versus validation. The validation stage is lightweight compared to the network-bound extraction step.

The architecture is intentionally stateless for single analyses and only minimally stateful for batches. There is no persistence layer, no authentication boundary, and no distributed job execution model. That keeps the prototype simple and easy to reason about, but a production version would likely need durable storage, identity and access controls, retry semantics, and a real background-processing subsystem.

## Client Writeup

The client was built with Next.js to provide a simple layout and straightforward styling. The visual direction was primarily based on the official U.S. Treasury site, including the reuse of public asset URLs. I also included a footer disclaimer to make it explicit that the application is an interview project and has no official government affiliation.

The UI was designed with modular sections and clear responsibilities. The page flow mirrors the intended workflow for uploading images, reviewing OCR output, and comparing results against application values.

The application has two primary modes of operation: individual analysis and batch comparison. Those modes map cleanly to the API design.

For clarity, especially in batch mode, I chose to display the currently processing images, a visible progress indicator, elapsed processing time, and clear color-coded pass, review, and fail statuses. I also added a toggleable review area so users can expand deeper details only when they need them.

The review section is designed to surface the summary first and the detailed evidence afterward. It shows the original image, the checked fields, the result for each field, and the attached reason when a field fails or requires review.

To keep the system transparent, I also included the raw OCR text and the preprocessing audit trail returned by the API.

## Future Improvements

### Use a More Accurate OCR Model

GPT-4o was selected because it was fast and relatively inexpensive for prototyping, but it is not the strongest OCR option available. Moving to a newer model would likely improve extraction accuracy.

### COLA Integration

The ideal long-term version of this system would pull expected application values directly from a database or API so that batch comparisons could run as an automated background workflow. In that design, the dashboard would shift from being upload-driven to being primarily a review and exception-handling surface.

### Azure Hosting

To keep development costs at zero, I used Vercel for the client and Render for the API. In a production setting, Azure would be the more appropriate hosting target for stability, integration, and enterprise controls.

### Persistent Results

The current implementation keeps results in client state and allows only limited CSV export for a batch run. That is acceptable for a proof of concept, but it is not enough for a production workflow.

The next logical step would be a database-backed design that stores image references, application values, compliance results, and review history. A related storage layer for uploaded image assets, such as Azure Blob Storage, would also make sense.

### User Accounts

For compliance and access-control reasons, user accounts would be an important addition. A future implementation would likely integrate centralized identity management and potentially single sign-on.

### Move the Stack to .NET

Rebuilding the API in .NET would improve performance and better align with the broader application architecture patterns I commonly use. It would also make more sense if this evolved into a larger internal operations platform rather than remaining a narrow prototype.

### PDF Exports

A printable PDF report would be useful for records management or workflows that still require physical documentation.

### Compliance Summary Views

The current implementation explains individual failures and reviews well, but a higher-level compliance summary for an entire batch would make the review workflow more efficient.

### Better Batch Input Workflows

I focused first on batch image uploads and ran out of time before I could cleanly add a structured text or CSV upload flow that maps expected values to specific filenames. Ideally, a user would upload a set of images and a companion data file, and the system would produce a report that joins both inputs automatically.

## Final Post-Mortem

Overall, I am satisfied with the project. Given the short timeline, I believe I delivered a credible application that improves the review workflow and meets the core expectations from the interviews. It satisfies the performance target, covers most of the requested functionality, and uses a code structure that is organized for future scaling.

With more time, I would have improved both the operational maturity and the overall accuracy of the system. Even so, for the timeframe and scope of the assignment, I believe the result is strong and representative of how I approach software engineering under constraints.