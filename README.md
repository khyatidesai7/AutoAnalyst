<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Run Locally
AutoAnalyst 🤖📊

AI-Powered Multimodal Data Analytics with Gemini

AutoAnalyst is an AI-powered analytics application built using Gemini in AI Studio that transforms raw data into actionable insights through a guided, conversational workflow. It supports multimodal data ingestion, automated data profiling, exploratory analysis, and insight generation, with outputs designed to integrate seamlessly into modern BI workflows.

🚀 Key Features

Multimodal Data Ingestion
Ingest structured and semi-structured data including:

CSV, Excel, JSON

PDFs containing tables

Images and handwritten documents via OCR

URLs with structured table content

Automated Data Profiling

Column-wise statistics (nulls, distributions, top values)

Dataset summaries and previews

Data quality observations and cleaning suggestions

Conversational Analytics

User-driven, step-by-step workflow

Explicit confirmation before each transformation or analysis step

No assumed intent, no hallucinated data

Insight & Dashboard Generation

Surface trends, anomalies, and KPIs using Gemini’s reasoning

Generate dashboard-ready specifications and plain-language analytical summaries

Outputs aligned with Material Design 3 principles

Designed for BI Integration

Analytics outputs are compatible with downstream BI tools (e.g., Power BI / Looker Studio workflows)

Clean separation between LLM reasoning and application-layer execution

🧠 Design Principles

Never hallucinate data — only real values from user-provided inputs

User-gated workflow — every stage requires confirmation

Multimodal-first — vision, OCR, and document understanding by default

Enterprise-safe — analytics-focused, not over-claiming production deployment

Material Design 3 — consistent layout, hierarchy, and color usage

🛠️ Tech Stack

Gemini (AI Studio) – Multimodal reasoning & conversational analytics

Node.js – Local development runtime

Frontend – AI Studio app scaffolding

BI Outputs – Dashboard-ready analytical specifications and summaries

📦 Run & Deploy the App

This repository contains everything required to run AutoAnalyst locally.

🔗 View in AI Studio

👉 https://ai.studio/apps/drive/1dg_DUrD4CoiZSmXH8jnlPIVjgibNaFFu

🖥️ Run Locally
Prerequisites

Node.js (v18+ recommended)

A valid Gemini API key

Setup
# Install dependencies
npm install


Create a .env.local file in the root directory and add:

GEMINI_API_KEY=your_gemini_api_key_here

Start the App
npm run dev


The application will start locally and connect to Gemini via AI Studio.

🧩 Example Use Cases

Rapid exploratory data analysis without manual SQL or BI setup

Profiling operational datasets to identify anomalies and trends

Generating executive-ready summaries from raw data

Accelerating analytics workflows for supply chain, finance, or operations data

📌 Project Context

This project was developed as part of the Google DeepMind × Kaggle “Vibe Code with Gemini 3 Pro” Hackathon, showcasing how multimodal LLMs can automate and enhance analytics workflows through AI Studio.

📄 License

This project is for educational and demonstration purposes.
Please review Gemini API and AI Studio usage policies before production use.
