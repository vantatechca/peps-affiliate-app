/* NO_00X monospace callout tag (devils.inc signature). */
export default function Tag({ no, children, dim = false, style, align = "left" }) {
  return (
    <div
      className={"tag" + (dim ? " dim" : "")}
      style={{ flexDirection: align === "right" ? "row-reverse" : "row", textAlign: align, ...style }}
    >
      <span className="chip">NO_{String(no).padStart(3, "0")}</span>
      <span>{children}</span>
    </div>
  );
}
