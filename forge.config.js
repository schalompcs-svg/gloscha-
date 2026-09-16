module.exports = {
  packagerConfig: {
    name: 'GPIAN',
    executableName: 'gpian',
    asar: true
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'gpian'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux', 'darwin']
    },
    {
      name: '@electron-forge/maker-deb'
    }
  ]
};
