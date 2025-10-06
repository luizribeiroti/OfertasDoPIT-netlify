const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'ofertas-pit-secret-2024'

// CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

// Helper to create standardized responses
const createResponse = (statusCode, data, headers = {}) => {
  return {
    statusCode,
    headers: { ...corsHeaders, ...headers },
    body: JSON.stringify(data)
  }
}

// Generate UUID v4
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12)
}

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Calculate discount percentage
const calculateDiscount = (originalPrice, offerPrice) => {
  return Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
}

// Create slug from string
const createSlug = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate URL format
const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Format date to ISO string
const formatDate = (date) => {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString()
}

// Parse date from ISO string or timestamp
const parseDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

module.exports = {
  corsHeaders,
  createResponse,
  generateId,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  calculateDiscount,
  createSlug,
  isValidEmail,
  isValidUrl,
  formatDate,
  parseDate
}