"use client";

type Props = {
  className?: string;
  shape?: "center" | "tail-left" | "tail-right";
};

const BUBBLE_PATHS = {
  center:
    "M427.875 0C548.825 7.72464e-06 646.875 99.3621 646.875 220.312C646.875 341.263 548.825 440.625 427.875 440.625H408.681L337.639 511.666L266.597 440.625H219C98.0497 440.625 0 341.263 0 220.312C0 99.3621 98.0496 0 219 0H427.875Z",
  "tail-left":
    "M427.875 0C548.825 7.72464e-06 646.875 99.3621 646.875 220.312C646.875 341.263 548.825 440.625 427.875 440.625H270.735L199.693 511.666L75.9502 387.923L76.502 387.37C29.6708 346.848 0 286.847 0 220.312C0 99.3621 98.0496 0 219 0H427.875Z",
  "tail-right":
    "M427.875 0C548.825 0 646.875 99.3621 646.875 220.312C646.875 286.571 617.45 346.349 570.955 386.864L572.014 387.923L448.271 511.666L377.229 440.625H219C98.0497 440.625 0 341.263 0 220.312C0 99.3621 98.0496 0 219 0H427.875Z",
} satisfies Record<NonNullable<Props["shape"]>, string>;

export function ChatBotIcon({ className, shape = "tail-right" }: Props) {
  const bodyPath = BUBBLE_PATHS[shape];

  return (
    <svg
      className={className}
      viewBox="0 0 647 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <path
        className="gnx-bot-body"
        d={bodyPath}
      />
      <path
        className="gnx-bot-shimmer"
        d={bodyPath}
      />
      <rect
        x="90.6736"
        y="78.1689"
        width="465.528"
        height="186.01"
        rx="93.0049"
        fill="#000318"
      />
      <g className="gnx-bot-eyes">
        <rect
          className="gnx-bot-eye"
          x="213.895"
          y="134.491"
          width="36.2723"
          height="70.3125"
          rx="18.1362"
          fill="#f8fafc"
        />
        <rect
          className="gnx-bot-eye"
          x="396.708"
          y="134.491"
          width="36.2723"
          height="70.3125"
          rx="18.1362"
          fill="#f8fafc"
        />
      </g>
      <g className="gnx-bot-mouth-wrap">
        <path
          className="gnx-bot-mouth"
          d="M285 345A75 75 0 0 0 362 345"
          stroke="#000318"
          strokeWidth="27"
          strokeLinecap="round"
        />
      </g>
      <circle
        className="gnx-bot-online-dot"
        cx="585"
        cy="72"
        r="38"
        fill="#20d66b"
      />
    </svg>
  );
}
