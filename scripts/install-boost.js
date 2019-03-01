const assert = require('assert')
const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { boost } = require('../package.json')

const stat = promisify(fs.stat)
const exec = promisify(cp.exec)
const execFile = promisify(cp.execFile)
const rename = promisify(fs.rename)
const rmdir = promisify(fs.rmdir)
const unlink = promisify(fs.unlink)

async function install() {
    try {
        let tarball = boost.tarball.split('/').pop()

        await exec('rm -rf boost *.tar.gz')
        await exec(`curl -L -O ${boost.tarball}`)

        // Ensure the file was downloaded
        let tarballStat = await stat(tarball)
        assert(tarballStat.isFile())

        // Verify the checksum
        let { stdout } = await execFile('shasum', ['-a', '256', '-b', tarball])
        let actualChecksum = /[a-f0-9]{64}/i.exec(stdout)
        assert(actualChecksum && boost.sha256 === actualChecksum[0])

        // Extract the boost subfolder and license folder
        let dest = path.basename(tarball, '.tar.gz')
        let licenseFile = `${dest}/${boost.license}`
        let boostFolder = `${dest}/boost`
        await exec(`tar -xzf ${tarball} ${licenseFile} ${boostFolder}`)

        // Check that extraction completed
        let licenseFileStat = await stat(licenseFile)
        let boostFolderStat = await stat(boostFolder)
        assert(licenseFileStat.isFile())
        assert(boostFolderStat.isDirectory())

        // Rename into current working directory
        await rename(licenseFile, path.basename(licenseFile))
        await rename(boostFolder, path.basename(boostFolder))

        // Remove extract destination
        await rmdir(dest)

        // Remove the tarball
        await unlink(tarball)

    } catch (error) {
        console.error(`Could not install this version of boost due to ${error}`)
        process.exit(1)
    }
}

install()
