import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Teacher } from "./Teacher";

describe("Teacher", () => {
  it("큰 크기에서는 볼과 하이라이트를 그린다", () => {
    const html = renderToStaticMarkup(<Teacher who="온" size={120} />);
    expect(html).toContain('data-part="cheek"');
    expect(html).toContain('data-part="shine"');
    expect(html).toContain('stroke-width="2.2"');
    expect(html).toContain('aria-label="온 선생님"');
  });
  it("40px 이하에서는 볼과 하이라이트를 빼고 선을 굵게 한다", () => {
    const html = renderToStaticMarkup(<Teacher who="온" size={40} />);
    expect(html).not.toContain('data-part="cheek"');
    expect(html).not.toContain('data-part="shine"');
    expect(html).toContain('stroke-width="2.8"');
    const brow = renderToStaticMarkup(<Teacher who="결" size={32} />);
    expect(brow).toContain('stroke-width="3.4"');
  });
  it("점프와 생각 점", () => {
    const html = renderToStaticMarkup(<Teacher who="새" state="think" jump />);
    expect(html).toContain('class="ci-jump"');
    expect(html).toContain('data-part="dots"');
  });
});
