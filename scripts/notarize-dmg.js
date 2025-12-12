const { notarize } = require('@electron/notarize')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_ATTEMPTS = 3

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function notarizeDMG(context) {
  // Find all DMG files in the output directory
  const dmgFiles = context.artifactPaths.filter(filePath => filePath.endsWith('.dmg'))
  
  if (dmgFiles.length === 0) {
    console.log('Skipping DMG notarization - no DMG files found')
    return
  }
  
  console.log(`Found ${dmgFiles.length} DMG file(s) for notarization`)

  for (const dmgPath of dmgFiles) {
    console.log(`🍎 Starting DMG notarization for: ${dmgPath}`)
    
    // Check if DMG exists
    if (!fs.existsSync(dmgPath)) {
      throw new Error(`DMG not found at: ${dmgPath}`)
    }

    // Prepare notarization options
    let notarizeOptions = {
      appPath: dmgPath,
      tool: 'notarytool'
    }

    // Prefer App Store Connect API key authentication
    const appleApiKey = process.env.APPLE_API_KEY
    const appleApiKeyId = process.env.APPLE_API_KEY_ID
    const appleApiIssuer = process.env.APPLE_API_ISSUER

    if (appleApiKey && appleApiKeyId && appleApiIssuer) {
      console.log('🔑 Using App Store Connect API key authentication for DMG')
      
      // Create temporary directory for API key
      const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'notarize-dmg-'))
      const apiKeyPath = path.join(tempDir, 'AuthKey.p8')
      
      try {
        // Write API key to temporary file with restricted permissions
        const apiKeyContent = Buffer.from(appleApiKey, 'base64').toString('utf8')
        fs.writeFileSync(apiKeyPath, apiKeyContent, { mode: 0o600 })
        
        notarizeOptions.appleApiKey = apiKeyPath
        notarizeOptions.appleApiKeyId = appleApiKeyId
        notarizeOptions.appleApiIssuer = appleApiIssuer
        
        // Perform DMG notarization with retry logic
        await performDMGNotarizationWithRetry(notarizeOptions)
        
        // Cleanup
        fs.unlinkSync(apiKeyPath)
        fs.rmdirSync(tempDir)
        
      } catch (error) {
        // Cleanup on error
        try {
          if (fs.existsSync(apiKeyPath)) fs.unlinkSync(apiKeyPath)
          if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
        } catch (cleanupError) {
          console.warn('⚠️ DMG cleanup warning:', cleanupError.message)
        }
        throw error
      }
      
    } else {
      // Fallback to Apple ID authentication
      console.log('🔐 Using Apple ID authentication for DMG (fallback)')
      
      const appleId = process.env.APPLE_ID
      const applePassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
      const teamId = process.env.APPLE_TEAM_ID
      
      if (!appleId || !applePassword || !teamId) {
        throw new Error('Missing required environment variables: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID')
      }
      
      notarizeOptions.appleId = appleId
      notarizeOptions.appleIdPassword = applePassword
      notarizeOptions.teamId = teamId
      
      // Perform DMG notarization with retry logic
      await performDMGNotarizationWithRetry(notarizeOptions)
    }
    
    console.log('✅ DMG notarization completed successfully!')
    
    // Verify stapling worked on the DMG - CRITICAL: MUST NOT FAIL
    console.log('🔍 Verifying DMG notarization ticket was stapled...')
    let validationSuccess = false
    
    try {
      const result = execSync(`xcrun stapler validate "${dmgPath}"`, { 
        encoding: 'utf8',
        timeout: 30000
      })
      console.log('✅ DMG notarization ticket verification successful!')
      validationSuccess = true
    } catch (error) {
      console.warn('⚠️ DMG stapler validation failed:', error.message)
      console.log('🔄 Waiting 10 seconds for stapling to complete...')
      await sleep(10000)
      
      try {
        const result = execSync(`xcrun stapler validate "${dmgPath}"`, { 
          encoding: 'utf8',
          timeout: 30000
        })
        console.log('✅ DMG notarization ticket verification successful after wait!')
        validationSuccess = true
      } catch (retryError) {
        console.error('❌ DMG stapler validation still failing after wait:', retryError.message)
        console.error('❌ CRITICAL: DMG notarization verification FAILED')
        console.error('❌ This DMG will show malware warnings to users')
        process.exit(1) // FAIL THE BUILD
      }
    }
    
    if (!validationSuccess) {
      console.error('❌ CRITICAL: DMG validation failed - build must fail')
      process.exit(1)
    }
    
    // CRITICAL: Verify app inside DMG also has notarization ticket
    console.log('🔍 Verifying app inside DMG has notarization ticket...')
    try {
      // Mount the DMG to check the app inside
      const mountOutput = execSync(`hdiutil attach "${dmgPath}" -readonly -nobrowse`, {
        encoding: 'utf8',
        timeout: 30000
      })
      
      const mountPoint = mountOutput.split('\n').find(line => line.includes('/Volumes/')).split('\t').pop().trim()
      console.log(`📁 Mounted DMG at: ${mountPoint}`)
      
      // Find the app inside
      const appInsideDMG = path.join(mountPoint, 'Rune.Tools (beta).app')
      
      if (fs.existsSync(appInsideDMG)) {
        console.log(`🔍 Checking notarization ticket on app: ${appInsideDMG}`)
        
        const appStaplerResult = execSync(`xcrun stapler validate "${appInsideDMG}"`, {
          encoding: 'utf8',
          timeout: 30000
        })
        console.log('✅ App inside DMG has valid notarization ticket!')
        
        // Also check spctl on the app
        const appSpctlResult = execSync(`spctl -a -vvv "${appInsideDMG}"`, {
          encoding: 'utf8', 
          timeout: 30000
        })
        console.log('✅ App inside DMG passes spctl verification!')
        
      } else {
        console.error('❌ CRITICAL: Could not find app inside DMG')
        process.exit(1)
      }
      
      // Unmount the DMG
      execSync(`hdiutil detach "${mountPoint}"`, { timeout: 30000 })
      console.log('📤 Unmounted DMG')
      
    } catch (appCheckError) {
      console.error('❌ CRITICAL: App inside DMG validation failed:', appCheckError.message)
      console.error('❌ App inside DMG lacks valid notarization ticket')
      
      // Try to unmount on error
      try {
        const mountOutput = execSync(`hdiutil info | grep "${dmgPath}"`, { encoding: 'utf8' })
        if (mountOutput) {
          const mountPoint = mountOutput.split('\n')[0].split('\t').pop().trim()
          execSync(`hdiutil detach "${mountPoint}"`, { timeout: 10000 })
        }
      } catch (unmountError) {
        console.warn('⚠️ Could not unmount DMG after error')
      }
      
      process.exit(1) // FAIL THE BUILD
    }
  }
}

async function performDMGNotarizationWithRetry(options) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`📤 DMG notarization attempt ${attempt}/${MAX_ATTEMPTS}`)
      
      await notarize(options)
      
      console.log('🎉 DMG notarization successful!')
      return
      
    } catch (error) {
      console.error(`❌ DMG notarization attempt ${attempt} failed:`, error.message)
      
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`DMG notarization failed after ${MAX_ATTEMPTS} attempts: ${error.message}`)
      }
      
      const delay = Math.pow(2, attempt - 1) * 1000 // Exponential backoff: 1s, 2s, 4s
      console.log(`⏳ Waiting ${delay}ms before retry...`)
      await sleep(delay)
    }
  }
}

module.exports = notarizeDMG