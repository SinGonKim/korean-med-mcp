import { DOMParser } from "@xmldom/xmldom"

// Use @xmldom/xmldom DOM types via type imports
type XmlDocument = ReturnType<DOMParser["parseFromString"]>
type XmlElement = XmlDocument extends { getElementsByTagName(s: string): { item(i: number): infer E | null } } ? NonNullable<E> : never

export function parseXmlText(xml: string): XmlDocument {
  const parser = new DOMParser()
  return parser.parseFromString(xml, "text/xml")
}

function getTextContent(node: XmlDocument | XmlElement, tag: string): string {
  const list = (node as XmlDocument).getElementsByTagName(tag)
  const el = list.item(0)
  return el?.textContent?.trim() ?? ""
}

function getAllElements(doc: XmlDocument, tag: string): XmlElement[] {
  const nodeList = doc.getElementsByTagName(tag)
  const result: XmlElement[] = []
  for (let i = 0; i < nodeList.length; i++) {
    const item = nodeList.item(i)
    if (item) result.push(item as XmlElement)
  }
  return result
}

function getChildText(el: XmlElement, tag: string): string {
  const doc = { getElementsByTagName: (t: string) => (el as unknown as XmlDocument).getElementsByTagName(t) }
  return getTextContent(doc as unknown as XmlDocument, tag)
}

export interface LawSearchItem {
  lawId: string
  lawName: string
  lawNameEn: string
  lawType: string
  enforcementDate: string
  revisionDate: string
  mst: string
}

export function parseLawSearchXml(xml: string): LawSearchItem[] {
  const doc = parseXmlText(xml)
  const laws = getAllElements(doc, "law")
  return laws.map((law) => ({
    lawId: getChildText(law, "법령ID"),
    lawName: getChildText(law, "법령명한글"),
    lawNameEn: getChildText(law, "법령명영문"),
    lawType: getChildText(law, "법령구분명"),
    enforcementDate: getChildText(law, "시행일자"),
    revisionDate: getChildText(law, "공포일자"),
    mst: getChildText(law, "법령일련번호"),
  }))
}

export interface PrecedentItem {
  caseNo: string
  caseName: string
  court: string
  decisionDate: string
  summary: string
  lawRefName: string
  precedentId: string
}

export function parsePrecedentXml(xml: string): PrecedentItem[] {
  const doc = parseXmlText(xml)
  const precs = getAllElements(doc, "prec")
  return precs.map((p) => ({
    caseNo: getChildText(p, "사건번호"),
    caseName: getChildText(p, "사건명"),
    court: getChildText(p, "법원명"),
    decisionDate: getChildText(p, "선고일자"),
    summary: getChildText(p, "판시사항"),
    lawRefName: getChildText(p, "참조조문"),
    precedentId: getChildText(p, "판례일련번호"),
  }))
}

export interface AdminAppealItem {
  caseNo: string
  decisionDate: string
  summary: string
  result: string
  institution: string
  precedentId: string
}

export function parseAdminAppealXml(xml: string): AdminAppealItem[] {
  if (!xml || !xml.trim()) return []
  const doc = parseXmlText(xml)
  const items = getAllElements(doc, "decc")
  return items.map((item) => ({
    caseNo: getChildText(item, "사건번호"),
    decisionDate: getChildText(item, "의결일자"),
    summary: getChildText(item, "사건명"),
    result: getChildText(item, "재결구분명"),
    institution: getChildText(item, "재결청") || "중앙행정심판위원회",
    precedentId: getChildText(item, "행정심판재결례일련번호"),
  }))
}
