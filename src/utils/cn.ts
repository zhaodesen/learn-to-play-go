// 阿拉伯数字 → 中文大写(壹 贰 叁 ...),用于关卡序号展示。支持 0~99。
const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

export function toCnNum(n: number): string {
  if (n < 0) return String(n)
  if (n < 10) return DIGITS[n]
  if (n < 20) return '拾' + (n % 10 ? DIGITS[n % 10] : '')
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return DIGITS[tens] + '拾' + (ones ? DIGITS[ones] : '')
}
