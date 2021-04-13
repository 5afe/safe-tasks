import path from 'path'
import fs from 'fs/promises'

const cliCacheDir = "cli_cache"

export const proposalFile = (safeTxHash: string) => `${safeTxHash}.proposal.json`
export const signaturesFile = (safeTxHash: string) => `${safeTxHash}.signatures.json`

export const writeToCliCache = async(key: string, content: any) => {
    const folder = path.join(process.cwd(), cliCacheDir)
    try {
        await fs.access(folder)
    } catch (e) {
        await fs.mkdir(folder);
    }
    await fs.writeFile(path.join(folder, key), JSON.stringify(content, null, 2))
}

export const readFromCliCache = async(key: string): Promise<any> => {
    const content = await fs.readFile(path.join(process.cwd(), cliCacheDir, key), 'utf8')
    return JSON.parse(content)
}

export const loadSignatures = async(safeTxHash: string): Promise<Record<string, string>> => {
    try {
        return await readFromCliCache(signaturesFile(safeTxHash))
    } catch {
        return {}
    }
}