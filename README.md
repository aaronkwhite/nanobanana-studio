<p align="center">
  <i>If you find this project useful, consider supporting its development</i><br><br>
  <a href="https://buymeacoffee.com/aaronkwhite">
    <img src="https://github.com/user-attachments/assets/d1ba6440-d809-431c-8b3e-74e2380d2c64" width="120" alt="Buy Me A Coffee" />
  </a>
</p>

---

# Nanobanana Batch API Image Generator

A lightweight, self-hosted batch image generator powered by Google's Gemini API. Generate and transform images at **50% reduced cost** using the Batch API.

<p>
  <img src="https://github.com/user-attachments/assets/53b686f4-d92d-48a3-9d2f-a88ee8961f66" width="49%" />
  <img src="https://github.com/user-attachments/assets/231d4a39-2961-4cc6-8c2a-00f3c42186c6" width="49%" />
</p>


## Features

- **Text-to-Image** - Generate images from text prompts
- **Image-to-Image** - Transform existing images with AI (style transfer, enhancement, edits)
- **Batch Processing** - Queue multiple requests processed asynchronously
- **BYOK** - Bring your own Gemini API key, stored locally
- **Output Control** - Choose 1K, 2K, or 4K resolution with aspect ratio options
- **Temperature Control** - Fine-tune creativity vs consistency
- **Dark Mode** - Full light/dark theme support
- **Local Storage** - SQLite database, no cloud dependencies
- **Cost Tracking** - See estimated costs per generation

### Example: Image-to-Image Background Swap

**Original (Text-to-Image):**
> A banana in a space suit floating in zero gravity inside a spacecraft, looking out a window at Earth. Soft blue light from the planet, peaceful and awe-inspiring.

<p>
  <img src="https://github.com/user-attachments/assets/6b17929e-d050-4e18-9546-a57dbe39fe37" width="49%" />
</p>

**Transformed (Image-to-Image, temperature 0):**
> Make it so the subject is staring at Sugar Rush from the movie Wreck It Ralph instead of Earth.
>
<p>
  <img src="https://github.com/user-attachments/assets/86bb71ab-daa0-4f82-b7f7-37f8882478bb" width="49%" />
</p>

### More Examples: Aspect Ratios & Temperature

| 3:4 · Temp 1 | 16:9 · Temp 2 | 16:9 · Temp 1 |
|:---:|:---:|:---:|
| ![Workout Banana](https://github.com/user-attachments/assets/620b3b47-b839-4730-bdb8-527489ce352a) | ![Tutu Banana](https://github.com/user-attachments/assets/18ad8047-4399-4055-b9e2-db8b050f754f) | ![Cozy Reading](https://github.com/user-attachments/assets/0def7665-4714-4e61-9108-b092a43dd0a9) |
| *A determined banana lifting a tiny barbell at the gym, wearing a sweatband...* | *A happy banana wearing a fluffy pink tutu, standing in a ballet pose...* | *A banana curled up in an oversized armchair reading a tiny book, wearing round glasses...* |

## Prerequisites

- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/apikey) with access to image generation

## Installation

```bash
git clone https://github.com/aaronkwhite/nanobanana-studio.git
cd nanobanana-studio
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and add your Gemini API key in **Settings**.

<p>
  <img src="https://github.com/user-attachments/assets/0023eebe-b990-402e-92dd-40c60d318ae6" width="50%" />
</p>

## Usage

### Text-to-Image

1. Select the **Text to Image** tab
2. Enter your prompt describing the image
3. Adjust output size (1K/2K/4K), aspect ratio, and temperature
4. Press `Shift + Enter` or click Generate

### Image-to-Image

1. Select the **Image to Image** tab
2. Drag & drop or click to upload images
3. Enter a transformation prompt (e.g., "convert to watercolor painting")
4. Adjust settings and generate

### Batch Queue

Jobs are processed asynchronously via Gemini's Batch API. Processing typically takes 10-30 minutes depending on queue depth. The UI will update automatically when results are ready.

## CLI Utilities

```bash
# List all batch jobs from Gemini API
npm run batches:list

# Download results from a specific batch
npm run batches:download <batch-name>

# Backup the database
npm run db:backup [name]

# Restore from backup
npm run db:restore [name]
```

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - UI library
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [SQLite](https://www.sqlite.org/) - Local database via better-sqlite3
- [Gemini API](https://ai.google.dev/) - Image generation via @google/genai

## Project Structure

```
├── src/
│   ├── app/           # Next.js pages and API routes
│   ├── components/    # React components
│   └── lib/           # Database and Gemini utilities
├── scripts/           # CLI tools for batch management
├── data/              # Database, uploads, results (gitignored)
└── public/            # Static assets
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |

## Cost

Gemini Batch API pricing (as of Dec 2024):
- **1K**: ~$0.02/image
- **2K**: ~$0.07/image
- **4K**: ~$0.12/image

Batch API provides **50% cost reduction** compared to real-time API calls.

### About

<p>
  <img src="https://github.com/user-attachments/assets/e7c029b0-341b-4219-ac38-ca44cc25a54c" width="50%" />
</p>

### Support the project

<p>
  <img src="https://github.com/user-attachments/assets/6c2bce29-4175-45bc-b7b6-b291ddc9436e" width="50%" />
</p>

### Contributing

Contributions are welcome! Please open an issue or submit a pull request.

### License

MIT
