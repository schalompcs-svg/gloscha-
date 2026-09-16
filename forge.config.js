module.exports = {
  packagerConfig: {
    name: 'GPIAN',
    executableName: 'GPIAN',
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
