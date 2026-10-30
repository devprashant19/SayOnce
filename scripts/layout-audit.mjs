/**
 * The layout audit, shared by visual-check.mjs (every page as it loads) and
 * visual-states.mjs (pages after interaction: tour steps, drawers, menus).
 * Passed to page.evaluate(), so it must stay self-contained.
 */

/**
 * Runs inside the page. Everything here is a question the browser can answer
 * without judgement, which is what makes it a usable gate.
 */
export const AUDIT = () => {
  const problems = [];
  const vw = window.innerWidth;

  // --- 1. the page itself scrolls sideways -------------------------------
  if (document.documentElement.scrollWidth > vw + 1) {
    problems.push({
      kind: "horizontal-overflow",
      detail: `page scrollWidth ${document.documentElement.scrollWidth} > viewport ${vw}`,
    });
  }

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
    const text = (el.textContent ?? "").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    // Current Chrome lays out the content of a closed <details> without
    // painting it, so it reports a size and a position while nobody can see
    // it. Without this, every collapsed "Tell SayOnce what was wrong…" panel
    // read as text printed over the next card's heading.
    const closed = el.closest("details:not([open])");
    if (closed && !el.closest("summary")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const all = [...document.querySelectorAll("body *")].filter(visible);

  /**
   * A wide data table inside a deliberate horizontal scroll region is not a
   * layout defect — it is the standard way to show a ledger on a phone. So an
   * element only counts as overflowing if no ancestor scrolls it horizontally.
   * The ancestor must itself fit the viewport, otherwise it is the thing that
   * is broken and we still want to hear about it. Check 1 above independently
   * catches the case where the *page* ends up scrolling sideways, so this
   * cannot hide a genuine escape.
   */
  const inHorizontalScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox !== "auto" && ox !== "scroll") continue;
      if (p.scrollWidth <= p.clientWidth + 1) continue;
      const pr = p.getBoundingClientRect();
      if (pr.right <= vw + 2 && pr.left >= -2) return true;
    }
    return false;
  };

  // --- 2. a box sticks out past the viewport ------------------------------
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (getComputedStyle(el).position === "fixed") continue;
    if (inHorizontalScroller(el)) continue;
    if (r.right > vw + 2) {
      problems.push({
        kind: "element-overflow",
        detail: `${describe(el)} extends to ${Math.round(r.right)}px (viewport ${vw})`,
      });
    }
    if (r.left < -2) {
      problems.push({
        kind: "element-overflow",
        detail: `${describe(el)} starts at ${Math.round(r.left)}px`,
      });
    }
  }

  // --- 3. two pieces of text overlap -------------------------------------
  // Only leaf text elements, so a container legitimately wrapping its child
  // is not reported. Overlap must exceed 35% of the smaller box to count,
  // which tolerates sub-pixel and intentional tight stacking.
  /**
   * Text scrolled out of its own clipping container — a sticky pane with its
   * own scrollbar, say — cannot be seen, so it cannot collide with anything.
   * Without this, the /app pane scrolled by the guided tour put its hidden
   * "Step 1" label "on top of" a strip that had also scrolled off-screen.
   */
  const clippedAway = (el) => {
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      const ix = Math.min(r.right, pr.right) - Math.max(r.left, pr.left);
      const iy = Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top);
      if (ix <= 1 || iy <= 1) return true;
    }
    return false;
  };

  const leafText = all.filter((el) => {
    if (!(el.textContent ?? "").trim()) return false;
    if (el.children.length > 0) return false;
    const style = getComputedStyle(el);
    if (style.position === "absolute" || style.position === "fixed") return false;
    if (style.pointerEvents === "none") return false;
    if (clippedAway(el)) return false;
    return true;
  });

  const area = (r) => Math.max(0, r.width) * Math.max(0, r.height);

  /**
   * An inline element that wraps across lines has a bounding box covering
   * every line it touches — a box that includes whitespace it does not
   * actually occupy, and usually the element that follows it. Comparing those
   * boxes invents overlaps. getClientRects() gives one box per line, which is
   * what the reader actually sees, so compare line boxes instead.
   */
  const lineBoxes = (el) =>
    [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1);

  // A fixed or sticky ancestor puts its content on its own layer: a navbar
  // that the page scrolls under, or a menu that drops over the hero, is not
  // text printed on top of text.
  const getFixedRoot = (el) => {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const s = getComputedStyle(cur);
      if (s.position === "fixed" || s.position === "sticky") return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  const boxes = leafText.map(lineBoxes);
  for (let i = 0; i < leafText.length; i += 1) {
    const rootI = getFixedRoot(leafText[i]);
    for (let j = i + 1; j < leafText.length; j += 1) {
      const rootJ = getFixedRoot(leafText[j]);
      // Elements in separate fixed layers (or between a floating overlay and the static
      // document behind it) are distinct visual planes, not layout text overlaps.
      if (rootI !== rootJ) continue;

      let worst = 0;
      for (const a of boxes[i]) {
        for (const b of boxes[j]) {
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox <= 1 || oy <= 1) continue;
          const smaller = Math.min(area(a), area(b));
          if (smaller > 0) worst = Math.max(worst, (ox * oy) / smaller);
        }
      }
      if (worst > 0.35) {
        problems.push({
          kind: "text-overlap",
          detail: `${describe(leafText[i])} overlaps ${describe(leafText[j])} by ${Math.round(worst * 100)}%`,
        });
      }
    }
  }

  // --- 4. text clipped by its own container ------------------------------
  for (const el of leafText) {
    const style = getComputedStyle(el);
    const hidden = style.overflow === "hidden" || style.overflowY === "hidden";
    const clamped =
      style.webkitLineClamp && style.webkitLineClamp !== "none";
    const ellipsis = style.textOverflow === "ellipsis";
    if (!hidden || clamped || ellipsis) continue;
    if (el.scrollHeight > el.clientHeight + 2) {
      problems.push({
        kind: "clipped-text",
        detail: `${describe(el)} is cut off (content ${el.scrollHeight}px in ${el.clientHeight}px)`,
      });
    }
  }

  // --- 5. touch targets --------------------------------------------------
  const tappable = [
    ...document.querySelectorAll("button, a[href], [role='button'], input, select, textarea"),
  ].filter(visible);
  for (const el of tappable) {
    // A checkbox or radio inside a <label> is tapped through the label, so
    // the label is the target that has to be big enough.
    const isToggle = el.tagName === "INPUT" && /^(checkbox|radio)$/.test(el.type);
    const target = isToggle && el.closest("label") ? el.closest("label") : el;
    const r = target.getBoundingClientRect();
    if (r.height < 44 - 0.5 || r.width < 24) {
      problems.push({
        kind: "small-target",
        detail: `${describe(el)} is ${Math.round(r.width)}×${Math.round(r.height)}px (need 44px tall)`,
      });
    }
  }

  // --- 6. a region that scrolls inside the page --------------------------
  // A scroll box nested in a scrolling page hides content behind a second
  // scrollbar: /app's sticky pane cut its own Fan out button off that way,
  // and the clipped-text exemption above would never have seen it. Fixed
  // layers — drawers, dialogs, menus — and form fields may scroll.
  const inFixedLayer = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).position === "fixed" || p.getAttribute("role") === "dialog") return true;
    }
    return false;
  };
  for (const el of all) {
    if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== "auto" && oy !== "scroll") continue;
    if (el.scrollHeight <= el.clientHeight + 4) continue;
    if (inFixedLayer(el)) continue;
    problems.push({
      kind: "nested-scroll",
      detail: `${describe(el)} scrolls inside the page (content ${el.scrollHeight}px in ${el.clientHeight}px)`,
    });
  }

  // --- 7. a text box hiding its own text ---------------------------------
  for (const el of document.querySelectorAll("textarea")) {
    if (!visible(el)) continue;
    if (el.scrollHeight > el.clientHeight + 4) {
      problems.push({
        kind: "textarea-overflow",
        detail: `${describe(el)} hides ${el.scrollHeight - el.clientHeight}px of its text behind a scrollbar`,
      });
    }
  }

  // --- 8. a dropdown cutting off its own value ---------------------------
  // A native <select> reports no overflow, so its chosen value is measured
  // against the room inside it: /app's project picker showed "Diwali
  // retail o" and passed every other check.
  const ctx = document.createElement("canvas").getContext("2d");
  for (const el of document.querySelectorAll("select")) {
    if (!visible(el) || !ctx) continue;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // The page tracks text tighter (-0.011em); measure the way it renders.
    ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    const text = el.options[el.selectedIndex]?.text ?? "";
    // Measure the native arrow rather than guess it: an auto-width select of
    // known text, same font and padding, minus that text and the padding.
    const probe = document.createElement("select");
    probe.style.cssText =
      `position:absolute;visibility:hidden;left:-9999px;font:${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily};` +
      `padding-left:${cs.paddingLeft};padding-right:${cs.paddingRight}`;
    probe.add(new Option("MMMMMMMM"));
    document.body.appendChild(probe);
    const arrow =
      probe.clientWidth -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight) -
      ctx.measureText("MMMMMMMM").width;
    probe.remove();
    const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - arrow;
    if (ctx.measureText(text).width > room + 1) {
      problems.push({
        kind: "clipped-select",
        detail: `${describe(el)} cuts off "${text}" (needs ${Math.round(ctx.measureText(text).width)}px, has ${Math.round(room)}px)`,
      });
    }
  }

  return problems;
};
