import floatingStyles from "./floating.css?inline";
import type { AnalysisResult, GeoClue, TopPrediction } from "../lib/types";

declare global {
  interface Window {
    __geoAiAssistantMounted?: boolean;
    __geoAiAssistantHost?: HTMLDivElement;
  }
}

if (!window.__geoAiAssistantMounted) {
  window.__geoAiAssistantMounted = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GEO_ASSISTANT_SHOW" && message.result) {
      renderPanel(message.result as AnalysisResult);
      sendResponse({ ok: true });
    }
    return false;
  });
}

function renderPanel(result: AnalysisResult) {
  const host = ensureHost();
  const root = host.shadowRoot?.querySelector<HTMLDivElement>("[data-panel-root]");
  if (!root) return;

  root.replaceChildren(createPanel(result));
}

function ensureHost(): HTMLDivElement {
  if (window.__geoAiAssistantHost?.isConnected) return window.__geoAiAssistantHost;

  const host = document.createElement("div");
  host.id = "geo-ai-assistant-root";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = floatingStyles;
  const root = document.createElement("div");
  root.dataset.panelRoot = "true";
  shadow.append(style, root);
  document.documentElement.appendChild(host);
  window.__geoAiAssistantHost = host;
  return host;
}

function createPanel(result: AnalysisResult): HTMLElement {
  const panel = el("aside", "geo-panel");
  const bar = el("div", "geo-panel-bar");
  const title = el("span", "geo-panel-title", "Geo AI Assistant");
  const actions = el("div", "geo-panel-actions");
  const collapseButton = button("-", "Collapse");
  const copyButton = button("Copy", "Copy analysis result");
  const closeButton = button("x", "Close");

  collapseButton.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    body.hidden = panel.classList.contains("collapsed");
    collapseButton.textContent = body.hidden ? ">" : "-";
    collapseButton.title = body.hidden ? "Expand" : "Collapse";
  });
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  });
  closeButton.addEventListener("click", () => {
    window.__geoAiAssistantHost?.remove();
    window.__geoAiAssistantHost = undefined;
  });

  actions.append(collapseButton, copyButton, closeButton);
  bar.append(title, actions);

  const body = el("div", "geo-panel-body");
  body.append(createPredictionCard(result));
  panel.append(bar, body);
  return panel;
}

function createPredictionCard(result: AnalysisResult): HTMLElement {
  const card = el("section", "prediction-card compact");
  const head = el("div", "card-head");
  const headingWrap = el("div");
  headingWrap.append(el("span", "eyebrow", "AI Analysis"), el("h2", "", result.fast_answer || result.top_predictions[0]?.country || "Unknown"));
  head.append(headingWrap);
  card.append(head);

  const list = el("div", "prediction-list");
  result.top_predictions.slice(0, 3).forEach((prediction, index) => list.append(createPredictionRow(prediction, index)));
  card.append(list);

  const location = result.estimated_location;
  const locationText =
    location?.lat != null && location?.lng != null
      ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
      : "Coordinates uncertain";
  card.append(el("div", "location-line", `${locationText}${location?.radius_km ? ` | radius about ${location.radius_km} km` : ""}`));

  const clues = el("div", "clue-list");
  result.clues.slice(0, 4).forEach((clue) => clues.append(createClue(clue)));
  card.append(clues);

  if (result.next_observation_suggestions.length > 0) {
    const suggestions = el("div", "suggestions");
    const text = el("div");
    result.next_observation_suggestions.slice(0, 3).forEach((suggestion) => text.append(el("p", "", suggestion)));
    suggestions.append(text);
    card.append(suggestions);
  }

  return card;
}

function createPredictionRow(prediction: TopPrediction, index: number): HTMLElement {
  const row = el("div", "prediction-row");
  const main = el("div");
  main.append(el("strong", "", prediction.country));
  if (prediction.region) main.append(el("span", "", prediction.region));
  main.append(el("p", "", prediction.reason));
  row.append(el("span", "rank", String(index + 1)), main, el("b", "", `${Math.round(prediction.confidence * 100)}%`));
  return row;
}

function createClue(clue: GeoClue): HTMLElement {
  const item = el("article", "clue");
  item.append(el("span", "", clue.type), el("p", "", clue.observation), el("small", "", clue.interpretation));
  return item;
}

function button(text: string, title: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.title = title;
  element.textContent = text;
  return element;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = "",
  text = ""
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
