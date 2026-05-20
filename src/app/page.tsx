'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ExternalLink,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Copy,
  Zap,
  ArrowRight,
  Users,
  Hash,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProcessedLink {
  id: string
  originalUrl: string
  convertedUrl: string
  name: string
  phone: string
  isDuplicate: boolean
  duplicateCount: number
}

function extractParam(url: string, param: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get(param) || ''
  } catch {
    return ''
  }
}

function convertUrl(originalUrl: string): string {
  try {
    return originalUrl.replace(/utm_source=abandoned/g, 'utm_source=fb')
  } catch {
    return originalUrl
  }
}

function isValidAbandonedUrl(url: string): boolean {
  try {
    const trimmed = url.trim()
    if (!trimmed) return false
    const urlObj = new URL(trimmed)
    return urlObj.searchParams.get('utm_source') === 'abandoned'
  } catch {
    return false
  }
}

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [processedLinks, setProcessedLinks] = useState<ProcessedLink[]>([])
  const [isProcessed, setIsProcessed] = useState(false)
  const { toast } = useToast()

  const processLinks = useCallback(() => {
    const lines = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      toast({
        title: 'Tidak ada link',
        description: 'Silakan masukkan minimal 1 link URL.',
        variant: 'destructive',
      })
      return
    }

    // Validate all URLs
    const invalidUrls = lines.filter((line) => !isValidAbandonedUrl(line))
    if (invalidUrls.length > 0) {
      toast({
        title: `${invalidUrls.length} link tidak valid`,
        description:
          'Pastikan semua link mengandung utm_source=abandoned dan format URL valid.',
        variant: 'destructive',
      })
      return
    }

    // Deduplication based on original URL
    const seen = new Map<string, { count: number; firstIndex: number }>()
    const results: ProcessedLink[] = []

    lines.forEach((url, index) => {
      const existing = seen.get(url)
      if (existing) {
        existing.count++
        // Update the duplicate count on the first occurrence
        results[existing.firstIndex].duplicateCount = existing.count
        results[existing.firstIndex].isDuplicate = true
      } else {
        seen.set(url, { count: 1, firstIndex: results.length })
        const name = decodeURIComponent(extractParam(url, 'name') || '')
        const phone = decodeURIComponent(extractParam(url, 'phone') || '')
        results.push({
          id: `link-${index}`,
          originalUrl: url,
          convertedUrl: convertUrl(url),
          name,
          phone,
          isDuplicate: false,
          duplicateCount: 1,
        })
      }
    })

    setProcessedLinks(results)
    setIsProcessed(true)

    const duplicateCount = lines.length - results.length
    toast({
      title: 'Berhasil diproses!',
      description: `${results.length} link unik dihasilkan${duplicateCount > 0 ? `, ${duplicateCount} duplikat dihapus` : ''}.`,
    })
  }, [inputText, toast])

  const openAllNewTabs = useCallback(() => {
    const uniqueLinks = processedLinks.filter((link) => !link.isDuplicate || link.duplicateCount >= 1)
    // Actually we want to open all unique links
    const linksToOpen = processedLinks // all are unique in the results array

    if (linksToOpen.length === 0) return

    if (linksToOpen.length > 20) {
      const confirmed = window.confirm(
        `Anda akan membuka ${linksToOpen.length} tab baru. Lanjutkan?`
      )
      if (!confirmed) return
    }

    linksToOpen.forEach((link) => {
      window.open(link.convertedUrl, '_blank')
    })

    toast({
      title: `${linksToOpen.length} tab dibuka`,
      description: 'Semua link telah dibuka di tab baru.',
    })
  }, [processedLinks, toast])

  const openSingleTab = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const copyAllLinks = useCallback(() => {
    const allConverted = processedLinks.map((l) => l.convertedUrl).join('\n')
    navigator.clipboard.writeText(allConverted)
    toast({
      title: 'Disalin!',
      description: 'Semua link hasil konversi telah disalin ke clipboard.',
    })
  }, [processedLinks, toast])

  const copySingleLink = useCallback(
    (url: string) => {
      navigator.clipboard.writeText(url)
      toast({
        title: 'Disalin!',
        description: 'Link telah disalin ke clipboard.',
      })
    },
    [toast]
  )

  const resetAll = useCallback(() => {
    setInputText('')
    setProcessedLinks([])
    setIsProcessed(false)
  }, [])

  const stats = useMemo(() => {
    const totalInput = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0).length
    const uniqueCount = processedLinks.length
    const duplicateCount = totalInput - uniqueCount
    const hasDuplicates = duplicateCount > 0
    return { totalInput, uniqueCount, duplicateCount, hasDuplicates }
  }, [inputText, processedLinks])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-x-hidden w-full">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Lead Abandoned Converter
              </h1>
              <p className="text-sm text-slate-500">
                Convert utm_source=abandoned → utm_source=fb
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid gap-6">
          {/* Input Section */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Input Links
              </CardTitle>
              <CardDescription>
                Paste link abandoned di bawah ini. Satu link per baris. Semua link
                harus mengandung <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">utm_source=abandoned</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full overflow-hidden">
                <Textarea
                  placeholder={`https://example.com/product?utm_source=abandoned&name=John&phone=+62812345678&abandoned_cart_id=abc123\nhttps://example.com/product?utm_source=abandoned&name=Jane&phone=+62812345679&abandoned_cart_id=def456`}
                  className="min-h-[200px] font-mono text-sm resize-y break-all whitespace-pre-wrap"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    if (isProcessed) setIsProcessed(false)
                  }}
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Hash className="w-4 h-4" />
                  <span>
                    {stats.totalInput} link terdeteksi
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    disabled={!inputText && processedLinks.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={processLinks}
                    disabled={!inputText.trim()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                  >
                    <Zap className="w-4 h-4 mr-1.5" />
                    Convert
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {isProcessed && processedLinks.length > 0 && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Hash className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Input</p>
                        <p className="text-lg font-bold text-slate-900">{stats.totalInput}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Link Unik</p>
                        <p className="text-lg font-bold text-emerald-600">{stats.uniqueCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Duplikat</p>
                        <p className="text-lg font-bold text-amber-600">{stats.duplicateCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                        <Users className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Leads</p>
                        <p className="text-lg font-bold text-teal-600">{stats.uniqueCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Duplicate Warning */}
              {stats.hasDuplicates && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {stats.duplicateCount} link duplikat terdeteksi
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Link yang sama hanya akan muncul sekali di hasil. Duplikat ditandai dengan badge kuning.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-600 font-medium">
                      {stats.uniqueCount} link siap dibuka
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyAllLinks}
                      >
                        <Copy className="w-4 h-4 mr-1.5" />
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        onClick={openAllNewTabs}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        Open All ({stats.uniqueCount} Tabs)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results List */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Hasil Konversi</CardTitle>
                  <CardDescription>
                    Klik &quot;Open&quot; untuk membuka link di tab baru
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[480px]">
                    <div className="divide-y divide-slate-100">
                      {processedLinks.map((link, index) => (
                        <div
                          key={link.id}
                          className={`p-4 hover:bg-slate-50/50 transition-colors ${
                            link.isDuplicate ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Lead Info */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-slate-400">
                                  #{index + 1}
                                </span>
                                {link.name && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-medium"
                                  >
                                    {link.name}
                                  </Badge>
                                )}
                                {link.phone && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {link.phone}
                                  </Badge>
                                )}
                                {link.isDuplicate && (
                                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Duplikat ({link.duplicateCount}x)
                                  </Badge>
                                )}
                              </div>

                              {/* URL Conversion */}
                              <div className="space-y-1.5 w-full min-w-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 shrink-0">
                                    From
                                  </span>
                                  <p className="text-xs font-mono text-slate-500 truncate min-w-0 flex-1" title={link.originalUrl}>
                                    ...{link.originalUrl.split('?')[0].split('/').slice(-2).join('/')}?{link.originalUrl.split('?')[1]?.substring(0, 60)}...
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500 shrink-0">
                                    To
                                  </span>
                                  <p className="text-xs font-mono text-emerald-600 truncate min-w-0 flex-1" title={link.convertedUrl}>
                                    ...{link.convertedUrl.split('?')[0].split('/').slice(-2).join('/')}?{link.convertedUrl.split('?')[1]?.substring(0, 60)}...
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copySingleLink(link.convertedUrl)}
                                title="Copy link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openSingleTab(link.convertedUrl)}
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Open
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}


        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            Lead Abandoned Converter — Convert utm_source=abandoned to utm_source=fb
          </p>
        </div>
      </footer>
    </div>
  )
}
