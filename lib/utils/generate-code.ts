// Generate a random 4-digit code for quizzes
export function generateQuizCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Alias for generateQuizCode to maintain compatibility
export const generateCode = generateQuizCode

// Check if a code already exists
export async function isCodeUnique(code: string): Promise<boolean> {
  const { data } = await fetch(`/api/quiz/check-code?code=${code}`).then((res) => res.json())
  return !data
}

// Generate a unique code
export async function generateUniqueCode(): Promise<string> {
  let code = generateQuizCode()
  let isUnique = await isCodeUnique(code)

  // Try up to 10 times to generate a unique code
  let attempts = 0
  while (!isUnique && attempts < 10) {
    code = generateQuizCode()
    isUnique = await isCodeUnique(code)
    attempts++
  }

  return code
}
