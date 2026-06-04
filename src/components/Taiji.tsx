/** 太极图：首页标识 / 行棋指示 / 思考中旋转动画共用 */
export function Taiji({
  size = 40,
  spin = false,
  className = '',
}: {
  size?: number
  spin?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`taiji${spin ? ' taiji--spin' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48" fill="#f3ead4" />
      <path
        d="M50 2 a48 48 0 0 1 0 96 a24 24 0 0 1 0-48 a24 24 0 0 0 0-48 z"
        fill="#15181e"
      />
      <circle cx="50" cy="26" r="8" fill="#f3ead4" />
      <circle cx="50" cy="74" r="8" fill="#15181e" />
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="rgba(217,177,103,0.55)"
        strokeWidth="2"
      />
    </svg>
  )
}
