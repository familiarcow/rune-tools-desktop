const { notarize } = require('@electron/notarize')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_ATTEMPTS = 3

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context
  
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping app notarization - not building for macOS')
    return
  }

  const appName = context.packager.appInfo.productFilename || context.packager.appInfo.productName
  const appPath = path.join(appOutDir, `${appName}.app`)
  
  console.log(`🍎 Starting app notarization for: ${appPath}`)
  
  // Check if app exists
  if (!fs.existsSync(appPath)) {
    throw new Error(`App not found at: ${appPath}`)
  }

  // Prepare notarization options
  let notarizeOptions = {
    appPath: appPath,
    tool: 'notarytool'
  }

  // Prefer App Store Connect API key authentication
  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER

  if (appleApiKey && appleApiKeyId && appleApiIssuer) {
    console.log('🔑 Using App Store Connect API key authentication')
    
    // Create temporary directory for API key
    const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'notarize-'))
    const apiKeyPath = path.join(tempDir, 'AuthKey.p8')
    
    try {
      // Write API key to temporary file with restricted permissions
      const apiKeyContent = Buffer.from(appleApiKey, 'base64').toString('utf8')
      fs.writeFileSync(apiKeyPath, apiKeyContent, { mode: 0o600 })
      
      notarizeOptions.appleApiKey = apiKeyPath
      notarizeOptions.appleApiKeyId = appleApiKeyId
      notarizeOptions.appleApiIssuer = appleApiIssuer
      
      // Perform notarization with retry logic
      await performNotarizationWithRetry(notarizeOptions)
      
      // Cleanup
      fs.unlinkSync(apiKeyPath)
      fs.rmdirSync(tempDir)
      
    } catch (error) {
      // Cleanup on error
      try {
        if (fs.existsSync(apiKeyPath)) fs.unlinkSync(apiKeyPath)
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup warning:', cleanupError.message)
      }
      throw error
    }
    
  } else {
    // Fallback to Apple ID authentication
    console.log('🔐 Using Apple ID authentication (fallback)')
    
    const appleId = process.env.APPLE_ID
    const applePassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
    const teamId = process.env.APPLE_TEAM_ID
    
    if (!appleId || !applePassword || !teamId) {
      throw new Error('Missing required environment variables: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID')
    }
    
    notarizeOptions.appleId = appleId
    notarizeOptions.appleIdPassword = applePassword
    notarizeOptions.teamId = teamId
    
    // Perform notarization with retry logic
    await performNotarizationWithRetry(notarizeOptions)
  }
  
  console.log('✅ App notarization completed successfully!')
  
  // Verify stapling worked on the app
  console.log('🔍 Verifying app notarization ticket was stapled...')
  try {
    const result = execSync(`xcrun stapler validate "${appPath}"`, { 
      encoding: 'utf8',
      timeout: 30000
    })
    console.log('✅ App notarization ticket verification successful!')
  } catch (error) {
    console.warn('⚠️ App stapler validation failed:', error.message)
    console.log('🔄 Waiting 10 seconds for stapling to complete...')
    await sleep(10000)
    
    try {
      const result = execSync(`xcrun stapler validate "${appPath}"`, { 
        encoding: 'utf8',
        timeout: 30000
      })
      console.log('✅ App notarization ticket verification successful after wait!')
    } catch (retryError) {
      console.error('❌ App stapler validation still failing after wait:', retryError.message)
      throw new Error(`App stapling verification failed: ${retryError.message}`)
    }
  }
}

async function performNotarizationWithRetry(options) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`📤 App notarization attempt ${attempt}/${MAX_ATTEMPTS}`)
      
      await notarize(options)
      
      console.log('🎉 App notarization successful!')
      return
      
    } catch (error) {
      console.error(`❌ App notarization attempt ${attempt} failed:`, error.message)
      
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`App notarization failed after ${MAX_ATTEMPTS} attempts: ${error.message}`)
      }
      
      const delay = Math.pow(2, attempt - 1) * 1000 // Exponential backoff: 1s, 2s, 4s
      console.log(`⏳ Waiting ${delay}ms before retry...`)
      await sleep(delay)
    }
  }
}

module.exports = notarizeApp