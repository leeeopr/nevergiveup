export function numberToWordsBRL(value: number): string {
  if (value === 0) return 'zero reais'
  
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  function convertGroup(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    
    let result = ''
    const h = Math.floor(n / 100)
    const remainder = n % 100
    
    if (h > 0) {
      result += hundreds[h]
    }

    if (remainder > 0) {
      if (result !== '') result += ' e '
      if (remainder < 10) {
        result += units[remainder]
      } else if (remainder < 20) {
        result += teens[remainder - 10]
      } else {
        const t = Math.floor(remainder / 10)
        const u = remainder % 10
        result += tens[t]
        if (u > 0) {
          result += ' e ' + units[u]
        }
      }
    }
    return result
  }

  const intPart = Math.floor(Math.abs(value))
  const cents = Math.round((Math.abs(value) - intPart) * 100)

  let text = ''

  if (intPart === 0) {
    // zero reais
  } else if (intPart < 1000) {
    text = convertGroup(intPart) + (intPart === 1 ? ' real' : ' reais')
  } else if (intPart < 1000000) {
    const thousands = Math.floor(intPart / 1000)
    const remainder = intPart % 1000
    text = (thousands === 1 ? 'um mil' : convertGroup(thousands) + ' mil')
    if (remainder > 0) {
      text += (remainder < 100 || remainder % 100 === 0 ? ' e ' : ' ') + convertGroup(remainder)
    }
    text += ' reais'
  } else {
    text = intPart.toLocaleString('pt-BR') + ' reais'
  }

  if (cents > 0) {
    const centsText = convertGroup(cents) + (cents === 1 ? ' centavo' : ' centavos')
    if (text === '') {
      text = centsText
    } else {
      text += ' e ' + centsText
    }
  }

  return text ? text.toLowerCase() : 'zero reais'
}

export function formatDateInWords(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date()
    return formatDateInWords(now.toISOString().split('T')[0])
  }

  // Expecting YYYY-MM-DD or ISO string
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = cleanDateStr.split('-')
  
  let date: Date
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    date = new Date(year, month, day)
  } else {
    date = new Date(dateStr)
  }

  if (isNaN(date.getTime())) {
    date = new Date()
  }

  const day = date.getDate()
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ]
  const monthName = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day} de ${monthName} de ${year}`
}

export function formatDateNumeric(dateStr?: string | null): string {
  if (!dateStr) return ''

  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = cleanDateStr.split('-')
  
  if (parts.length === 3) {
    const year = parts[0]
    const month = parts[1].padStart(2, '0')
    const day = parts[2].padStart(2, '0')
    return `${day}/${month}/${year}`
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

