interface ResolveTaskInstructionsHtmlInput {
  instructionsHtml?: string | null | undefined;
  description?: string | null | undefined;
}

interface TaskInstructionsEditorInitialHtmlInput {
  instructionsHtml?: string | null | undefined;
  description?: string | null | undefined;
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "mark",
  "blockquote",
]);
const ALLOWED_ATTRS = new Set(["href", "target", "rel"]);

export const EMPTY_INSTRUCTIONS_HTML = "<p>Aucune consigne pour le moment.</p>";

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeHref(value: string): boolean {
  return value.startsWith("/") || value.startsWith("#") || /^https?:\/\//i.test(value);
}

function sanitizeFallbackHtml(rawHtml: string): string {
  const strippedDangerousBlocks = rawHtml
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");

  const sanitized = strippedDangerousBlocks.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (fullTag, rawTagName, rawAttrs) => {
    const tagName = String(rawTagName).toLowerCase();
    const isClosingTag = fullTag.startsWith("</");

    if (!ALLOWED_TAGS.has(tagName)) {
      return "";
    }

    if (isClosingTag) {
      return `</${tagName}>`;
    }

    if (tagName === "br") {
      return "<br>";
    }

    if (tagName !== "a") {
      return `<${tagName}>`;
    }

    const attributes: string[] = [];
    let hrefValue: string | null = null;
    let targetValue: string | null = null;
    let relValue: string | null = null;
    const attrsText = String(rawAttrs ?? "");
    const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

    for (const match of attrsText.matchAll(attributePattern)) {
      const name = (match[1] ?? "").toLowerCase();
      const value = (match[3] ?? match[4] ?? match[5] ?? "").trim();

      if (!name || name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
        continue;
      }

      if (name === "href") {
        if (!isSafeHref(value)) {
          continue;
        }
        hrefValue = value;
        continue;
      }

      if (name === "target") {
        if (value !== "_blank") {
          continue;
        }
        targetValue = value;
        continue;
      }

      if (name === "rel") {
        relValue = value;
      }
    }

    if (hrefValue) {
      attributes.push(`href="${escapeHtml(hrefValue)}"`);
    }

    if (targetValue) {
      attributes.push(`target="${escapeHtml(targetValue)}"`);
      const relTokens = new Set(
        (relValue ?? "")
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean),
      );
      relTokens.add("noopener");
      relTokens.add("noreferrer");
      attributes.push(`rel="${escapeHtml([...relTokens].join(" "))}"`);
    } else if (relValue) {
      attributes.push(`rel="${escapeHtml(relValue)}"`);
    }

    return attributes.length > 0 ? `<a ${attributes.join(" ")}>` : "<a>";
  });

  const normalized = sanitized.trim();
  return normalized || EMPTY_INSTRUCTIONS_HTML;
}

export function sanitizeMissionHtml(rawHtml: string): string {
  const html = rawHtml.trim();
  if (!html) {
    return EMPTY_INSTRUCTIONS_HTML;
  }

  if (typeof DOMParser === "undefined") {
    return sanitizeFallbackHtml(html);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  document.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((node) => node.remove());

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element);
  }

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = element.parentNode;
      if (!parent) {
        element.remove();
        continue;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      continue;
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === "href" && !isSafeHref(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === "target" && value !== "_blank") {
        element.removeAttribute(attribute.name);
      }
    }

    if (tagName === "a" && element.getAttribute("target") === "_blank") {
      const relTokens = new Set(
        (element.getAttribute("rel") ?? "")
          .split(/\s+/)
          .map((token) => token.trim())
          .filter(Boolean),
      );
      relTokens.add("noopener");
      relTokens.add("noreferrer");
      element.setAttribute("rel", [...relTokens].join(" "));
    }
  }

  const cleanHtml = document.body.innerHTML.trim();
  return cleanHtml || EMPTY_INSTRUCTIONS_HTML;
}

export function sanitizeInstructionsHtmlForStorage(rawHtml: string | null | undefined): string | null {
  const trimmed = rawHtml?.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = sanitizeMissionHtml(trimmed);
  return sanitized === EMPTY_INSTRUCTIONS_HTML ? null : sanitized;
}

export interface MissionInstructionsSections {
  mainInstructionsHtml: string;
  tipHtml: string | null;
}

function stripTipMarkerPrefix(value: string): string {
  return value.replace(/^\s*astuce\s*:\s*/i, "");
}

function splitTipWithFallbackParser(sanitizedHtml: string): MissionInstructionsSections {
  const markerPattern = /<blockquote[^>]*>\s*astuce\s*:\s*([\s\S]*?)<\/blockquote>/i;
  const markerMatch = sanitizedHtml.match(markerPattern);
  if (!markerMatch) {
    return {
      mainInstructionsHtml: sanitizedHtml || EMPTY_INSTRUCTIONS_HTML,
      tipHtml: null,
    };
  }

  const tipHtml = markerMatch[1]?.trim() || null;
  const mainInstructionsHtml = sanitizedHtml.replace(markerMatch[0], "").trim() || EMPTY_INSTRUCTIONS_HTML;

  return {
    mainInstructionsHtml,
    tipHtml,
  };
}

export function splitMissionInstructionsHtml(rawHtml: string): MissionInstructionsSections {
  const sanitizedHtml = sanitizeMissionHtml(rawHtml);

  if (typeof DOMParser === "undefined") {
    return splitTipWithFallbackParser(sanitizedHtml);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(sanitizedHtml, "text/html");
  const tipBlock = [...document.body.querySelectorAll("blockquote")].find((element) => {
    const textContent = element.textContent?.trim() ?? "";
    return /^astuce\s*:/i.test(textContent);
  });

  if (!tipBlock) {
    return {
      mainInstructionsHtml: sanitizedHtml || EMPTY_INSTRUCTIONS_HTML,
      tipHtml: null,
    };
  }

  const tipBlockClone = tipBlock.cloneNode(true) as HTMLElement;
  const walker = document.createTreeWalker(tipBlockClone, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const textContent = textNode.textContent ?? "";
    if (!textContent.trim()) {
      continue;
    }

    textNode.textContent = stripTipMarkerPrefix(textContent);
    break;
  }

  tipBlock.remove();

  const tipHtml =
    tipBlockClone.textContent?.trim()
      ? tipBlockClone.innerHTML.trim()
      : null;
  const mainInstructionsHtml = document.body.innerHTML.trim() || EMPTY_INSTRUCTIONS_HTML;

  return {
    mainInstructionsHtml,
    tipHtml,
  };
}

export function resolveTaskInstructionsEditorInitialHtml(
  input: TaskInstructionsEditorInitialHtmlInput,
): string {
  const richInstructions = input.instructionsHtml?.trim();
  if (richInstructions) {
    return richInstructions;
  }

  const description = input.description?.trim();
  if (!description) {
    return "";
  }

  return `<p>${escapeHtml(description)}</p>`;
}

export function resolveTaskInstructionsHtml(input: ResolveTaskInstructionsHtmlInput): string | null {
  const richInstructions = input.instructionsHtml?.trim();
  if (richInstructions) {
    return richInstructions;
  }

  const description = input.description?.trim();
  if (!description) {
    return null;
  }

  return `<p>${escapeHtml(description)}</p>`;
}
