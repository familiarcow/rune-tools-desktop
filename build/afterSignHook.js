const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function signFrameworkComponents(frameworkPath, identity) {
  console.log(`Signing framework components in: ${frameworkPath}`);
  
  // Sign all executables and libraries in framework
  const versionsPath = path.join(frameworkPath, 'Versions');
  if (fs.existsSync(versionsPath)) {
    const versions = fs.readdirSync(versionsPath);
    for (const version of versions) {
      const versionPath = path.join(versionsPath, version);
      if (fs.statSync(versionPath).isDirectory()) {
        // Sign Resources directory contents first
        const resourcesPath = path.join(versionPath, 'Resources');
        if (fs.existsSync(resourcesPath)) {
          const resources = fs.readdirSync(resourcesPath, { withFileTypes: true });
          for (const resource of resources) {
            if (resource.isFile() && (resource.name.includes('ShipIt') || !resource.name.includes('.'))) {
              const resourceFile = path.join(resourcesPath, resource.name);
              try {
                console.log(`  Signing resource: ${resource.name}`);
                execSync(`codesign --force --sign "${identity}" --timestamp --options runtime "${resourceFile}"`, { stdio: 'inherit' });
              } catch (error) {
                console.warn(`    Warning: Could not sign ${resource.name}: ${error.message}`);
              }
            }
          }
        }
        
        // Sign the main executable
        const executableName = path.basename(frameworkPath, '.framework');
        const executablePath = path.join(versionPath, executableName);
        if (fs.existsSync(executablePath)) {
          try {
            console.log(`  Signing main executable: ${executableName}`);
            execSync(`codesign --force --sign "${identity}" --timestamp --options runtime "${executablePath}"`, { stdio: 'inherit' });
          } catch (error) {
            console.error(`    Failed to sign ${executableName}: ${error.message}`);
          }
        }
      }
    }
  }
  
  // Finally sign the framework itself
  try {
    console.log(`  Signing framework: ${path.basename(frameworkPath)}`);
    execSync(`codesign --force --sign "${identity}" --timestamp --options runtime "${frameworkPath}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to sign framework: ${error.message}`);
  }
}

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('Running afterSign hook to sign frameworks...');
  
  const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const frameworksPath = path.join(appPath, 'Contents', 'Frameworks');
  
  const identity = 'Developer ID Application: Tyler Bond (974SWJKYUP)';
  
  // Sign Squirrel framework with detailed component signing
  const squirrelPath = path.join(frameworksPath, 'Squirrel.framework');
  if (fs.existsSync(squirrelPath)) {
    console.log('Signing Squirrel framework and components...');
    signFrameworkComponents(squirrelPath, identity);
  }
  
  // Sign Mantle framework with detailed component signing
  const mantlePath = path.join(frameworksPath, 'Mantle.framework');
  if (fs.existsSync(mantlePath)) {
    console.log('Signing Mantle framework and components...');
    signFrameworkComponents(mantlePath, identity);
  }
  
  console.log('afterSign hook completed');
};