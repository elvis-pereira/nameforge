module.exports = {
    branches: [
      'main',
      {
        name: 'beta',
        prerelease: true
      },
      {
        name: 'alpha',
        prerelease: true
      }
    ],
    plugins: [
      [
        '@semantic-release/commit-analyzer',
        {
          preset: 'conventionalcommits'
        }
      ],
      ['@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits'
      }
    ],
      [
        '@semantic-release/gitlab',
        {
          successComment: false,
          failComment: false,
          failTitle: false,
          assets: [
            {
              url: `${process.env.PACKAGE_REGISTRY_URL}/${process.env.VERSION}/module.zip`,
              label: 'module.zip',
              type: 'package',
              filepath: '/module.zip'
            },
            {
              url: `${process.env.PACKAGE_REGISTRY_URL}/${process.env.VERSION}/module.json`,
              label: 'module.json',
              type: 'package',
              filepath: '/module.json'
            }
          ]
        }
      ],
      [
        '@semantic-release/git',
        {
          assets: [
            'package.json',
            'module.json'
          ],
          message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}'
        }
      ]
    ]
  }
  