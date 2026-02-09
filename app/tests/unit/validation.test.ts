describe('Validation Logic', () => {
  describe('Email Validation', () => {
    it('should accept valid email', () => {
      const validEmail = 'test@ualberta.ca'
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(validEmail)).toBe(true)
    })

    it('should reject invalid email format', () => {
      const invalidEmail = 'notanemail'
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(invalidEmail)).toBe(false)
    })

    it('should reject empty email', () => {
      const emptyEmail = ''
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(emptyEmail)).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should accept password with 8+ characters', () => {
      const validPassword = 'password123'
      expect(validPassword.length >= 8).toBe(true)
    })

    it('should reject password with less than 8 characters', () => {
      const shortPassword = 'pass'
      expect(shortPassword.length >= 8).toBe(false)
    })

    it('should reject empty password', () => {
      const emptyPassword = ''
      expect(emptyPassword.length >= 8).toBe(false)
    })
  })

  describe('Course Title Validation', () => {
    it('should accept non-empty course title', () => {
      const validTitle = 'PMCOL 400 Lec A1'
      expect(validTitle.trim().length > 0).toBe(true)
    })

    it('should reject empty course title', () => {
      const emptyTitle = '   '
      expect(emptyTitle.trim().length > 0).toBe(false)
    })
  })
})