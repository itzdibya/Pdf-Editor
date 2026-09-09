# PDF & Image Suite

[![CI/CD - Build & Deploy to GitHub Pages](https://github.com/itzdibya/Pdf-Editor/actions/workflows/deploy.yml/badge.svg)](https://github.com/itzdibya/Pdf-Editor/actions/workflows/deploy.yml)

A powerful, 100% in-browser, private, and client-side document and PDF manipulation suite. No files are uploaded to external servers; all conversions and edits take place directly inside the user's browser.

🌐 **Live URL**: [https://itzdibya.github.io/Pdf-Editor/](https://itzdibya.github.io/Pdf-Editor/)

---

## 🚀 Continuous Integration & Deployment (CI/CD)

This repository includes automated CI/CD using GitHub Actions:

- **Automated Validation (CI)**: On every push or pull request to `master` (or `main`), GitHub Actions verifies that all essential assets (`index.html`, `style.css`, `script.js`) exist and validates JavaScript syntax.
- **Automated Deployment (CD)**: On every commit pushed to `master` (or `main`), GitHub Actions automatically packages and deploys the latest version to **GitHub Pages**.
- **Manual Trigger**: You can also manually trigger a deployment from the GitHub Actions tab (`workflow_dispatch`).

### One-Time Setup in GitHub Repository Settings:
To enable GitHub Pages deployment via GitHub Actions:
1. Open your repository on GitHub: [itzdibya/Pdf-Editor](https://github.com/itzdibya/Pdf-Editor)
2. Go to **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, choose **GitHub Actions** from the dropdown.
4. That's it! Every future `git push` to `master` will automatically deploy live.

---

## 🛠️ Making Changes & Deploying

To push changes and trigger an automatic deployment:

```bash
# 1. Stage modified files
git add .

# 2. Commit your changes
git commit -m "feat: your update message"

# 3. Push to master (this automatically triggers the CI/CD pipeline)
git push origin master
```

You can view live build logs and deployment status under the **Actions** tab of your GitHub repository.
