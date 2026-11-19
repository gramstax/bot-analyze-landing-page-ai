# References

This folder holds the source material this project was recreated from:
the original workflow definition, exported as JSON.

- `n8n-3100-analyze-landing-page-with-openai-and-get-optimization-tips.json`
  — the original workflow (id 3100, 4 nodes): a form trigger that takes a
  landing-page URL, an HTTP request that scrapes the page, an AI agent
  that roasts the page as a CRO expert and gives exactly 10 optimization
  recommendations, and an OpenAI chat model (`o1`, reasoning effort high).

The JSON is a reference only. The bot in this repository is an original
Gramstax implementation — it does not use, depend on, or connect to the
original workflow tool.
