import { ExcelRequirementResponse } from "@shared/schema";
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle,
  Packer
} from 'docx';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Generates a DOCX file from the response data and returns it as a Blob
 */
export const generateDocxFile = async (items: ExcelRequirementResponse[]): Promise<Blob> => {
  // Group by RFP Name
  const itemsByRfpName: Record<string, ExcelRequirementResponse[]> = {};
  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  // Create document with sections
  const sections = [];
  
  // Title section
  sections.push({
    properties: {},
    children: [
      // Title
      new Paragraph({
        text: "RFP Response Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 400, // 20pt after
        },
      })
    ]
  });
  
  // Generate content for each RFP
  for (const [rfpName, rfpItems] of Object.entries(itemsByRfpName)) {
    // Get date from most recent item
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    const date = latestItem?.timestamp
      ? new Date(latestItem.timestamp).toLocaleDateString()
      : new Date().toLocaleDateString();
      
    // RFP section
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: rfpName,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 300, // 15pt before
          },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Date: ${date}`,
              italics: true,
              color: "666666",
            }),
          ],
          spacing: {
            after: 300, // 15pt after
          },
        }),
        
        // Add each requirement and its response
        ...rfpItems.flatMap((item, index) => {
          const paragraphs = [];
          
          // Requirement header
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Requirement ${index + 1}: `,
                  bold: true,
                }),
                new TextRun({
                  text: item.requirement || "No requirement text",
                  bold: true,
                  color: "4F46E5",
                }),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: {
                before: 400, // 20pt before
              },
            })
          );
          
          // Category if exists
          if (item.category) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Category: ${item.category}`,
                    italics: true,
                    color: "666666",
                  }),
                ],
                spacing: {
                  after: 200, // 10pt after
                },
              })
            );
          }
          
          // Response content or placeholder
          if (item.finalResponse) {
            // Split response into paragraphs and process
            const responseParagraphs = item.finalResponse.split("\n\n");
            responseParagraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                paragraphs.push(
                  new Paragraph({
                    text: paragraph.trim(),
                    spacing: {
                      after: 160, // 8pt after
                    },
                  })
                );
              }
            });
          } else {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "No response generated",
                    italics: true,
                    color: "999999",
                  }),
                ],
                spacing: {
                  after: 200, // 10pt after
                },
              })
            );
          }
          
          // Add separator
          if (index < rfpItems.length - 1) {
            paragraphs.push(
              new Paragraph({
                text: "",
                border: {
                  bottom: {
                    color: "EEEEEE",
                    space: 12,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
                spacing: {
                  before: 300, // 15pt before
                  after: 300, // 15pt after
                },
              })
            );
          }
          
          return paragraphs;
        })
      ]
    });
  }
  
  // Create the document with all sections
  const doc = new Document({
    sections: sections
  });
  
  // Generate and return blob
  return await Packer.toBlob(doc);
};

/**
 * Downloads a generated DOCX file
 */
export const downloadDocxFile = async (
  items: ExcelRequirementResponse[],
  filename = "rfp-responses.docx"
): Promise<void> => {
  try {
    // Generate DOCX blob
    const blob = await generateDocxFile(items);
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    
    // Trigger a click on the anchor to start the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating DOCX file:", error);
    throw error;
  }
};

/**
 * Generates a markdown string from a list of RFP responses
 * Format: RFP Name, Date, followed by each requirement and its response
 */
export const generateMarkdownContent = (
  items: ExcelRequirementResponse[]
): string => {
  if (!items.length) return "";

  // Group items by RFP Name for better organization
  const itemsByRfpName: Record<string, ExcelRequirementResponse[]> = {};

  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  let markdownContent = "";

  // Process each RFP group
  Object.entries(itemsByRfpName).forEach(([rfpName, rfpItems]) => {
    // Add RFP header
    markdownContent += `# RFP Name - ${rfpName}\n\n`;
    
    // Add date (use the most recent timestamp from the items)
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    if (latestItem?.timestamp) {
      const date = new Date(latestItem.timestamp).toLocaleDateString();
      markdownContent += `Date: ${date}\n\n`;
    } else {
      markdownContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
    }

    // Add each requirement and its response
    rfpItems.forEach((item) => {
      // Add requirement
      markdownContent += `## ${item.category ? `${item.category}: ` : ""}${item.requirement || "No requirement text"}\n\n`;
      
      // Add response (if available)
      if (item.finalResponse) {
        markdownContent += `${item.finalResponse}\n\n`;
      } else {
        markdownContent += `*No response generated*\n\n`;
      }
      
      // Add separator for better readability
      markdownContent += "---\n\n";
    });
  });

  return markdownContent;
};

/**
 * Exports the markdown content as a downloadable file
 */
export const downloadMarkdownFile = (
  markdownContent: string,
  filename = "rfp-responses.md"
): void => {
  // Create a blob with the markdown content
  const blob = new Blob([markdownContent], { type: "text/markdown" });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  
  // Trigger a click on the anchor to start the download
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type EventMappingEntry = {
  name?: string | null;
  confidence?: number | null;
};

/**
 * Safely parses the eventMappings payload (string or object)
 */
const parseEventMappingsPayload = (raw: unknown): Record<string, EventMappingEntry> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse eventMappings payload for export', err);
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, EventMappingEntry>;
  }
  return null;
};

/**
 * Orders the available events by confidence (desc) while keeping original order as tie-breaker.
 */
const getOrderedEvents = (raw: unknown): (EventMappingEntry | null)[] => {
  const parsed = parseEventMappingsPayload(raw);
  const normalizeName = (value: unknown): string | null => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.name === 'string') return obj.name;
      if (typeof obj.event === 'string') return obj.event;
      if (typeof obj.title === 'string') return obj.title;
    }
    return null;
  };

  const normalizeConfidence = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }
    return null;
  };

  const entries = ['event1', 'event2', 'event3'].map((key, index) => {
    const value = parsed ? parsed[key] : null;
    if (!value) return null;

    const name = normalizeName(value);
    const confidence = normalizeConfidence((value as EventMappingEntry)?.confidence);

    if (!name && confidence === null) return null;

    return { name: name || undefined, confidence, _index: index } as EventMappingEntry & { _index: number };
  }).filter((item): item is EventMappingEntry & { _index: number } => item !== null);

  const sorted = entries.sort((a, b) => {
    const confA = typeof a.confidence === 'number' ? a.confidence : -1;
    const confB = typeof b.confidence === 'number' ? b.confidence : -1;
    if (confA === confB) return a._index - b._index;
    return confB - confA;
  });

  const normalized: (EventMappingEntry | null)[] = sorted.map(({ _index, ...rest }) => rest);
  while (normalized.length < 3) {
    normalized.push(null);
  }
  return normalized.slice(0, 3);
};

const formatEventCell = (entry: EventMappingEntry | null): string => {
  if (!entry || !entry.name) return 'Unmapped';
  if (typeof entry.confidence === 'number') {
    return `${entry.name} (${entry.confidence.toFixed(2)})`;
  }
  return entry.name;
};

const escapeCsvValue = (value: string): string => {
  const safe = value ?? '';
  const needsQuotes = /[",\n]/.test(safe);
  const escaped = safe.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

/**
 * Downloads a CSV showing Category, Requirement, and the top 3 mapped events.
 * Maintains the incoming items order (e.g., upload order) and fills missing values with 'Unmapped'.
 */
export const downloadEventMappingCsv = (
  items: ExcelRequirementResponse[],
  filename = "event-mapping.csv"
): void => {
  const headers = ['Category', 'Requirement', 'Event1', 'Event2', 'Event3'];
  const rows = [headers];

  items.forEach((item) => {
    const orderedEvents = getOrderedEvents(item.eventMappings);
    const row = [
      item.category || '',
      item.requirement || '',
      ...orderedEvents.map(formatEventCell)
    ];
    rows.push(row);
  });

  const csvContent = rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Strips markdown formatting from text to provide plain text for Excel export
 */
export const stripMarkdownFormatting = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove headers
    .replace(/^#+\s+(.+)$/gm, '$1')
    // Remove bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Remove bullet points and numbered lists but keep the content
    .replace(/^\s*[-*]\s+(.+)$/gm, '$1')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Replace links with just the text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Replace code blocks with their content
    .replace(/```[a-z]*\n([\s\S]*?)\n```/gm, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up excessive spacing
    .replace(/\n\n+/g, '\n\n')
    .trim();
};

/**
 * Generate a complete HTML email template for the responses
 */
export const generateHtmlEmailContent = (items: any[]): string => {
  if (!items.length) return "";

  // Group items by RFP Name
  const itemsByRfpName: Record<string, any[]> = {};
  items.forEach((item) => {
    const rfpName = item.rfpName || "Unnamed RFP";
    if (!itemsByRfpName[rfpName]) {
      itemsByRfpName[rfpName] = [];
    }
    itemsByRfpName[rfpName].push(item);
  });

  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RFP Responses</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .rfp-header {
        background-color: #f5f5f5;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 5px;
        border-left: 5px solid #4f46e5;
      }
      .rfp-title {
        font-size: 24px;
        margin: 0;
        color: #333;
      }
      .rfp-date {
        color: #666;
        margin-top: 5px;
      }
      .requirement {
        margin-bottom: 30px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
      }
      .requirement-header {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #4f46e5;
      }
      .requirement-category {
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
        font-style: italic;
      }
      .response {
        white-space: pre-line;
      }
      .no-response {
        color: #999;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <h1 style="text-align: center; margin-bottom: 30px; color: #4f46e5;">RFP Response Report</h1>
  `;

  // Process each RFP group
  Object.entries(itemsByRfpName).forEach(([rfpName, rfpItems]) => {
    // Get date from most recent item
    const latestItem = [...rfpItems].sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    })[0];
    
    const date = latestItem?.timestamp
      ? new Date(latestItem.timestamp).toLocaleDateString()
      : new Date().toLocaleDateString();

    // Add RFP section
    htmlContent += `
    <div class="rfp-header">
      <h2 class="rfp-title">${rfpName}</h2>
      <div class="rfp-date">Date: ${date}</div>
    </div>
    `;

    // Add each requirement and response
    rfpItems.forEach((item) => {
      htmlContent += `
      <div class="requirement">
        <div class="requirement-header">${item.requirement || "No requirement text"}</div>
        ${item.category ? `<div class="requirement-category">Category: ${item.category}</div>` : ''}
        <div class="response">
          ${item.finalResponse 
            ? convertSimpleMarkdownToHtml(item.finalResponse) 
            : '<div class="no-response">No response generated</div>'}
        </div>
      </div>
      `;
    });
  });

  htmlContent += `
  </body>
  </html>
  `;

  return htmlContent;
};

/**
 * Convert simple markdown elements to HTML
 * This is a basic converter for the most common markdown elements
 */
export const convertSimpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  return markdown
    // Replace headers
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: bold; margin-top: 18px; margin-bottom: 9px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 18px; font-weight: bold; margin-top: 16px; margin-bottom: 8px;">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 style="font-size: 16px; font-weight: bold; margin-top: 14px; margin-bottom: 7px;">$1</h4>')
    
    // Replace bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Replace lists
    .replace(/^\s*-\s+(.+)$/gm, '<ul style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ul>')
    .replace(/^\s*\*\s+(.+)$/gm, '<ul style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ul>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<ol style="margin-top: 10px; margin-bottom: 10px;"><li>$1</li></ol>')
    
    // Replace horizontal rules
    .replace(/^---$/gm, '<hr style="border: 0; height: 1px; background-color: #ddd; margin: 16px 0;">')
    
    // Replace links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline;">$1</a>')
    
    // Replace paragraphs (two newlines)
    .replace(/\n\n/g, '</p><p>')
    
    // Wrap the content in a paragraph if it's not already
    .replace(/^(?!<h|<p|<ul|<ol|<hr|<div)(.+)$/gm, '<p>$1</p>')
    
    // Clean up any empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    
    // Fix nested paragraphs in lists
    .replace(/<li><p>(.*?)<\/p><\/li>/g, '<li>$1</li>')
    
    // Replace consecutive closing and opening paragraph tags
    .replace(/<\/p><p>/g, '</p>\n<p>')
    
    // Wrap in a container div
    .replace(/^(.+)$/, '<div>$1</div>');
};

/**
 * Send email with markdown content using the default email client
 * This downloads the markdown file first, then opens the default email client
 */
export const sendEmailWithContent = (
  markdownContent: string,
  subject = "RFP Responses Export",
  to = ""
): void => {
  // First download the markdown file
  // This ensures the user has the content regardless of email client behavior
  downloadMarkdownFile(markdownContent, "rfp-responses.md");
  
  // Show notification about markdown download
  showNotification("Markdown file downloaded. Launching email client...", "success");
  
  // Open the default email client with the content
  openMailtoLink(markdownContent, subject, to);
};

/**
 * Helper function to show notifications
 * Simple implementation that logs to console and shows alerts for errors
 */
const showNotification = (
  message: string, 
  type: "success" | "error" | "loading" = "success"
): void => {
  // Log to console with better formatting based on type
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // For now, we'll use a simple alert for errors
  if (type === "error") {
    // Show error alert in a nonblocking way to prevent UI freeze
    setTimeout(() => alert(message), 0);
  }
};

/**
 * Helper function to clear notifications
 */
const clearNotification = (id: number) => {
  // Implement notification clearing logic if your app has a toast system
  console.log(`Cleared notification ${id}`);
};

/**
 * Fallback method that opens the default mail client with the content as text email
 */
export const openMailtoLink = (
  markdownContent: string,
  subject = "RFP Responses Export",
  to = ""
): void => {
  // Create a mailto link with the markdown content in the body
  const emailBody = encodeURIComponent(markdownContent);
  
  const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${emailBody}`;
  
  // Open the mail client
  window.location.href = mailtoLink;
};

/**
 * Opens WhatsApp with the markdown content ready to share
 * Optimized to handle larger content more efficiently
 */
export const shareViaWhatsApp = (
  markdownContent: string
): void => {
  try {
    // First download the markdown file to ensure the user has a local copy
    // Use a try/catch within this operation to ensure the main function continues
    try {
      downloadMarkdownFile(markdownContent, "rfp-responses.md");
      showNotification("Markdown file downloaded. Launching WhatsApp...", "success");
    } catch (downloadErr) {
      console.warn("Unable to download markdown file, but continuing with WhatsApp share:", downloadErr);
    }
    
    // Prepare content for WhatsApp with performance optimization
    // WhatsApp has a character limit, so we'll truncate if necessary
    const MAX_LENGTH = 4000; // WhatsApp message character limit
    
    // Use substring directly instead of storing the entire content in a new variable
    const whatsAppText = markdownContent.length > MAX_LENGTH 
      ? markdownContent.substring(0, MAX_LENGTH - 150) + 
        "\n\n... (Content truncated due to length. Please refer to the downloaded markdown file for the complete content.)"
      : markdownContent;
    
    // Create WhatsApp sharing link - create it in a memory-efficient way
    // Use encodeURIComponent inside a requestAnimationFrame to prevent UI blocking
    requestAnimationFrame(() => {
      const whatsAppLink = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`;
      window.open(whatsAppLink, '_blank');
    });
  } catch (error) {
    console.error("Error sharing via WhatsApp:", error);
    // Use a more user-friendly message
    showNotification(`Couldn't share via WhatsApp. Please try downloading as a file instead.`, "error");
  }
};

/**
 * Generates an Excel file with RFP responses
 * Only includes Category, Requirement, and Final Response columns
 * Includes formatted header row and styled cells
 * Optimized for performance with large datasets
 */
export const generateExcelFile = (items: ExcelRequirementResponse[]): XLSX.WorkBook => {
  if (!items.length) {
    throw new Error("No items to export");
  }
  
  // Pre-allocate header styles to avoid recreating them for each cell
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "4F46E5" } }, // Primary color background
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };
  
  // Pre-allocate row styles
  const evenRowStyle = {
    alignment: { wrapText: true, vertical: "top" },
    fill: { patternType: "solid", fgColor: { rgb: "F5F5F5" } } // Light gray for even rows
  };
  
  const oddRowStyle = {
    alignment: { wrapText: true, vertical: "top" },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } } // White for odd rows
  };
  
  // Create simplified data array with only the required columns 
  // Use a buffer size of 100 items at a time to avoid memory issues with large arrays
  const BUFFER_SIZE = 100;
  const bufferCount = Math.ceil(items.length / BUFFER_SIZE);
  
  // Create workbook first (outside the loop)
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet with empty data first
  const worksheet = XLSX.utils.aoa_to_sheet([["Category", "Requirement", "Final Response"]]);
  
  // Set column widths (same as before)
  worksheet['!cols'] = [
    { wch: 15 },  // Category - 15 characters
    { wch: 30 },  // Requirement - 30 characters
    { wch: 100 }  // Final Response - 100 characters
  ];
  
  // Style header row (already added)
  const headerRange = XLSX.utils.decode_range("A1:C1");
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    worksheet[headerCellRef].s = headerStyle;
  }
  
  // Process data in chunks to avoid memory issues
  let currentRow = 1; // Start after header
  
  for (let bufferIndex = 0; bufferIndex < bufferCount; bufferIndex++) {
    const startIdx = bufferIndex * BUFFER_SIZE;
    const endIdx = Math.min(startIdx + BUFFER_SIZE, items.length);
    const chunk = items.slice(startIdx, endIdx);
    
    // Process each item in the chunk
    chunk.forEach((item, idx) => {
      const rowData = [
        item.category || "Uncategorized",
        item.requirement || "No requirement text",
        stripMarkdownFormatting(item.finalResponse || "No response")
      ];
      
      // Add this row to the worksheet
      for (let col = 0; col < rowData.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: col });
        worksheet[cellRef] = { v: rowData[col], t: 's' }; // 't' stands for 'type', 's' is string
        
        // Apply styles based on row index
        worksheet[cellRef].s = currentRow % 2 === 0 ? evenRowStyle : oddRowStyle;
      }
      
      currentRow++;
    });
  }
  
  // Update worksheet range reference
  worksheet['!ref'] = XLSX.utils.encode_range({ 
    s: { r: 0, c: 0 }, 
    e: { r: currentRow - 1, c: 2 } 
  });
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "RFP Responses");
  
  return workbook;
};

/**
 * Downloads an Excel file with RFP responses
 * Optimized to handle large datasets and prevent UI freezing
 */
export const downloadExcelFile = (
  items: ExcelRequirementResponse[],
  filename = "rfp-responses.xlsx"
): void => {
  // Show a loading notification to the user for better UX during large exports
  showNotification("Preparing Excel export...", "loading");
  
  // Use setTimeout to move the intensive operation off the main thread
  // This prevents UI freezing during large exports
  setTimeout(() => {
    try {
      // Generate workbook in the background thread
      const workbook = generateExcelFile(items);
      
      // Use requestAnimationFrame to ensure UI responsiveness during file writing
      requestAnimationFrame(() => {
        // Write workbook to file and trigger download
        XLSX.writeFile(workbook, filename);
        
        // Update notification on success
        showNotification("Excel file downloaded successfully!", "success");
      });
    } catch (error) {
      console.error("Error generating Excel file:", error);
      
      // Update notification on error
      showNotification(
        `Failed to generate Excel file: ${error instanceof Error ? error.message : "Unknown error"}`, 
        "error"
      );
    }
  }, 50); // Small delay to allow UI to update first
};

/**
 * EKG Assessment data structure for export
 */
export interface EkgAssessmentData {
  requirementText: string;
  ekgStatus: string;
  fitmentPercentage: number | null;
  availableFeatures: string[];
  gapsCustomizations: string[];
  subrequirements: Array<{
    id: string;
    title: string;
    status: string;
    weight: number | null;
    fitment: number | null;
    integrationRelated: boolean;
    reportingRelated: boolean;
    customizationNotes: string;
    referencesCount: number;
  }>;
}

/**
 * Generates an Excel file with EKG Assessment data including
 * Available Features, Gaps/Customizations, and Subrequirements table
 */
export const generateEkgAssessmentExcel = (data: EkgAssessmentData): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();
  
  // Header styles
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "7C3AED" } }, // Purple color
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };
  
  // === Sheet 1: Summary ===
  const summaryData = [
    ["EKG Assessment Summary"],
    [],
    ["Requirement", data.requirementText],
    ["Status", data.ekgStatus || "N/A"],
    ["Overall Fitment", data.fitmentPercentage !== null ? `${data.fitmentPercentage}%` : "Not calculated"],
    [],
    ["AVAILABLE FEATURES"],
    ...data.availableFeatures.map(f => ["", f]),
    [],
    ["GAPS / CUSTOMIZATIONS"],
    ...data.gapsCustomizations.map(g => ["", g])
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 100 }];
  
  // Merge title cell
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  
  // === Sheet 2: Subrequirements ===
  const subreqHeaders = ["ID", "Title", "Status", "Weight", "Fitment", "Integration", "Reporting", "Customization Notes", "Refs"];
  const subreqData = [
    subreqHeaders,
    ...data.subrequirements.map(sr => [
      sr.id,
      sr.title,
      sr.status,
      sr.weight !== null ? sr.weight : "—",
      sr.fitment !== null ? `${sr.fitment}%` : "—",
      sr.integrationRelated ? "Yes" : "—",
      sr.reportingRelated ? "Yes" : "—",
      sr.customizationNotes || "—",
      sr.referencesCount || "—"
    ])
  ];
  
  const subreqSheet = XLSX.utils.aoa_to_sheet(subreqData);
  subreqSheet['!cols'] = [
    { wch: 8 },   // ID
    { wch: 40 },  // Title
    { wch: 18 },  // Status
    { wch: 8 },   // Weight
    { wch: 10 },  // Fitment
    { wch: 12 },  // Integration
    { wch: 12 },  // Reporting
    { wch: 50 },  // Customization Notes
    { wch: 6 }    // Refs
  ];
  
  // Style header row
  for (let col = 0; col < subreqHeaders.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (subreqSheet[cellRef]) {
      subreqSheet[cellRef].s = headerStyle;
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, subreqSheet, "Subrequirements");
  
  return workbook;
};

/**
 * Downloads EKG Assessment data as an Excel file
 */
export const downloadEkgAssessmentExcel = (
  data: EkgAssessmentData,
  filename = "ekg-assessment.xlsx"
): void => {
  showNotification("Preparing EKG Assessment export...", "loading");
  
  setTimeout(() => {
    try {
      const workbook = generateEkgAssessmentExcel(data);
      
      requestAnimationFrame(() => {
        XLSX.writeFile(workbook, filename);
        showNotification("EKG Assessment downloaded successfully!", "success");
      });
    } catch (error) {
      console.error("Error generating EKG Assessment Excel:", error);
      showNotification(
        `Failed to export EKG Assessment: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  }, 50);
};

/**
 * Multi-item EKG Assessment data structure for batch export
 */
export interface MultiEkgExportData {
  rfpName: string;
  creatorName: string;
  items: Array<{
    requirementId: number | string;
    requirementText: string;
    category: string;
    ekgStatus: string;
    fitmentPercentage: number | null;
    response: string;
    availableFeatures: string[];
    gapsCustomizations: string[];
    subrequirements: Array<{
      id: string;
      title: string;
      status: string;
      weight: number | null;
      fitment: number | null;
      integrationRelated: boolean;
      reportingRelated: boolean;
      customizationNotes: string;
      referencesCount: number;
    }>;
  }>;
}

/**
 * Helper function to calculate row height based on content for autofit
 * @param text - The cell text content
 * @param columnWidth - The column width in Excel units
 * @param fontSize - Font size (default 11)
 * @returns Calculated row height
 */
const calculateRowHeight = (text: string, columnWidth: number, fontSize: number = 11): number => {
  if (!text || typeof text !== 'string') return 20;
  
  // Approximate characters per line based on column width and font size
  // Excel column width units are approximately 7 pixels per unit
  const charsPerLine = Math.floor((columnWidth * 7) / (fontSize * 0.6));
  if (charsPerLine <= 0) return 20;
  
  // Count line breaks in the text
  const lineBreaks = (text.match(/\n/g) || []).length;
  
  // Calculate wrapped lines for the text
  const words = text.split(/\s+/);
  let lines = 1;
  let currentLineLength = 0;
  
  for (const word of words) {
    if (currentLineLength + word.length + 1 > charsPerLine) {
      lines++;
      currentLineLength = word.length;
    } else {
      currentLineLength += word.length + 1;
    }
  }
  
  // Total lines = wrapped lines + explicit line breaks
  const totalLines = lines + lineBreaks;
  
  // Row height: base height per line (approximately 15 points per line at font size 11)
  const lineHeight = fontSize * 1.4;
  const calculatedHeight = Math.max(20, totalLines * lineHeight + 6);
  
  // Cap at reasonable maximum
  return Math.min(calculatedHeight, 400);
};

/**
 * Auto-fit row heights for a worksheet based on cell content
 * @param worksheet - The ExcelJS worksheet
 * @param startRow - Starting row (1-based)
 * @param endRow - Ending row (1-based), or undefined for all rows
 */
const autoFitRows = (worksheet: ExcelJS.Worksheet, startRow: number = 1, endRow?: number): void => {
  const lastRow = endRow || worksheet.rowCount;
  
  for (let rowNum = startRow; rowNum <= lastRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    let maxHeight = 20;
    
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const cellValue = cell.value;
      if (cellValue === null || cellValue === undefined) return;
      
      const text = String(cellValue);
      const column = worksheet.getColumn(colNumber);
      const columnWidth = typeof column.width === 'number' ? column.width : 15;
      
      // Get font size from cell or default
      const fontSize = cell.font?.size || 11;
      
      const height = calculateRowHeight(text, columnWidth, fontSize);
      if (height > maxHeight) {
        maxHeight = height;
      }
    });
    
    row.height = maxHeight;
  }
};

/**
 * Generates a professionally styled multi-sheet Excel workbook using ExcelJS
 * Includes: Table of Contents, Summary with Charts, Features & Gaps, Subrequirements,
 * Detailed View, Event Mapping, and RFP Responses sheets
 */
export const generateMultiEkgAssessmentExcelJS = async (data: MultiEkgExportData & { originalItems?: ExcelRequirementResponse[] }): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.creatorName;
  workbook.created = new Date();
  
  // Define reusable styles
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' }  // Purple
  };
  
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 11
  };
  
  const sectionHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDE9FE' }  // Light purple
  };
  
  const sectionHeaderFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: 'FF5B21B6' },
    size: 11
  };
  
  const evenRowFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF9FAFB' }  // Light gray
  };
  
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
  };

  // === Calculate Analytics ===
  const totalRequirements = data.items.length;
  const itemsWithFitment = data.items.filter(i => i.fitmentPercentage !== null);
  const fitmentScores = itemsWithFitment.map(i => i.fitmentPercentage as number);
  
  const avgFitment = fitmentScores.length > 0 
    ? (fitmentScores.reduce((a, b) => a + b, 0) / fitmentScores.length)
    : null;
  
  const maxFitment = fitmentScores.length > 0 ? Math.max(...fitmentScores) : null;
  const minFitment = fitmentScores.length > 0 ? Math.min(...fitmentScores) : null;
  
  const highFitment = fitmentScores.filter(s => s >= 80).length;
  const mediumFitment = fitmentScores.filter(s => s >= 50 && s < 80).length;
  const lowFitment = fitmentScores.filter(s => s < 50).length;
  
  const statusCounts: Record<string, number> = {};
  data.items.forEach(item => {
    const status = item.ekgStatus || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  const categoryCounts: Record<string, number> = {};
  data.items.forEach(item => {
    const category = item.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  const totalSubreqs = data.items.reduce((sum, item) => sum + item.subrequirements.length, 0);

  // === SHEET 1: Table of Contents ===
  const tocSheet = workbook.addWorksheet('Table of Contents', {
    properties: { tabColor: { argb: 'FF1F2937' } }
  });
  
  tocSheet.columns = [
    { width: 5 },
    { width: 25 },
    { width: 70 }
  ];
  
  // Title
  tocSheet.mergeCells('A1:C1');
  const tocTitleCell = tocSheet.getCell('A1');
  tocTitleCell.value = 'EKG ASSESSMENT REPORT';
  tocTitleCell.font = { bold: true, size: 20, color: { argb: 'FF7C3AED' } };
  tocTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  tocSheet.getRow(1).height = 40;
  
  tocSheet.mergeCells('A2:C2');
  tocSheet.getCell('A2').value = data.rfpName;
  tocSheet.getCell('A2').font = { size: 14, color: { argb: 'FF6B7280' } };
  tocSheet.getCell('A2').alignment = { horizontal: 'center' };
  
  tocSheet.mergeCells('A3:C3');
  tocSheet.getCell('A3').value = `Created by: ${data.creatorName} | Exported: ${new Date().toLocaleDateString()}`;
  tocSheet.getCell('A3').font = { size: 10, color: { argb: 'FF9CA3AF' } };
  tocSheet.getCell('A3').alignment = { horizontal: 'center' };
  
  // Table of Contents Header
  let tocRow = 5;
  tocSheet.mergeCells(`A${tocRow}:C${tocRow}`);
  tocSheet.getCell(`A${tocRow}`).value = 'TABLE OF CONTENTS';
  tocSheet.getCell(`A${tocRow}`).font = sectionHeaderFont;
  tocSheet.getCell(`A${tocRow}`).fill = sectionHeaderFill;
  tocSheet.getRow(tocRow).height = 25;
  
  tocRow++;
  ['#', 'Sheet Name', 'Description'].forEach((header, idx) => {
    const cell = tocSheet.getCell(tocRow, idx + 1);
    cell.value = header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: idx === 0 ? 'center' : 'left', vertical: 'middle' };
    cell.border = thinBorder;
  });
  
  const tocItems = [
    ['1', 'Table of Contents', 'This sheet - overview of all sheets in this report'],
    ['2', 'Summary & Analytics', 'Key metrics, fitment distribution, status breakdown, and visual charts'],
    ['3', 'Features & Gaps', 'Available features and gaps/customizations for each requirement'],
    ['4', 'Subrequirements', 'Detailed subrequirements breakdown with weights and fitment scores'],
    ['5', 'Detailed View', 'Complete details for each requirement including response, features, gaps, and subrequirements'],
    ['6', 'Event Mapping', 'Mapped events with confidence scores for each requirement'],
    ['7', 'RFP Responses', 'Final responses with category and requirement text (Excel export format)']
  ];
  
  tocItems.forEach((rowData, idx) => {
    tocRow++;
    rowData.forEach((val, colIdx) => {
      const cell = tocSheet.getCell(tocRow, colIdx + 1);
      cell.value = val;
      cell.border = thinBorder;
      cell.alignment = { horizontal: colIdx === 0 ? 'center' : 'left', vertical: 'middle', wrapText: true };
      if (idx % 2 === 0) cell.fill = evenRowFill;
    });
    tocSheet.getRow(tocRow).height = 25;
  });
  
  // Report Summary
  tocRow += 2;
  tocSheet.mergeCells(`A${tocRow}:C${tocRow}`);
  tocSheet.getCell(`A${tocRow}`).value = 'REPORT SUMMARY';
  tocSheet.getCell(`A${tocRow}`).font = sectionHeaderFont;
  tocSheet.getCell(`A${tocRow}`).fill = sectionHeaderFill;
  
  tocRow++;
  tocSheet.getCell(`A${tocRow}`).value = '•';
  tocSheet.getCell(`B${tocRow}`).value = 'Total Requirements:';
  tocSheet.getCell(`B${tocRow}`).font = { bold: true };
  tocSheet.getCell(`C${tocRow}`).value = totalRequirements;
  
  tocRow++;
  tocSheet.getCell(`A${tocRow}`).value = '•';
  tocSheet.getCell(`B${tocRow}`).value = 'Average Fitment:';
  tocSheet.getCell(`B${tocRow}`).font = { bold: true };
  tocSheet.getCell(`C${tocRow}`).value = avgFitment !== null ? `${avgFitment.toFixed(1)}%` : 'N/A';
  tocSheet.getCell(`C${tocRow}`).font = { bold: true, color: { argb: 'FF7C3AED' } };
  
  tocRow++;
  tocSheet.getCell(`A${tocRow}`).value = '•';
  tocSheet.getCell(`B${tocRow}`).value = 'Total Subrequirements:';
  tocSheet.getCell(`B${tocRow}`).font = { bold: true };
  tocSheet.getCell(`C${tocRow}`).value = totalSubreqs;

  // === SHEET 2: Summary with Charts ===
  const summarySheet = workbook.addWorksheet('Summary & Analytics', {
    properties: { tabColor: { argb: 'FF7C3AED' } }
  });
  
  // Set column widths - extended for chart area
  summarySheet.columns = [
    { width: 28 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 15 },
    { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
  ];
  
  // Title
  summarySheet.mergeCells('A1:E1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'EKG ASSESSMENT REPORT';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1F2937' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;
  
  // Report Details Section
  let row = 3;
  summarySheet.getCell(`A${row}`).value = 'REPORT DETAILS';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:E${row}`);
  
  row++;
  summarySheet.getCell(`A${row}`).value = 'RFP Name';
  summarySheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF6B7280' } };
  summarySheet.getCell(`B${row}`).value = data.rfpName;
  
  row++;
  summarySheet.getCell(`A${row}`).value = 'Created By';
  summarySheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF6B7280' } };
  summarySheet.getCell(`B${row}`).value = data.creatorName;
  
  row++;
  summarySheet.getCell(`A${row}`).value = 'Export Date';
  summarySheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF6B7280' } };
  summarySheet.getCell(`B${row}`).value = new Date().toLocaleDateString();
  
  // Key Metrics Section
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'KEY METRICS';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:E${row}`);
  
  row++;
  const metricsStartRow = row;
  summarySheet.getCell(`A${row}`).value = 'Total Requirements';
  summarySheet.getCell(`B${row}`).value = totalRequirements;
  summarySheet.getCell(`B${row}`).font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } };
  summarySheet.getCell(`D${row}`).value = 'Average Fitment';
  summarySheet.getCell(`E${row}`).value = avgFitment !== null ? `${avgFitment.toFixed(1)}%` : 'N/A';
  summarySheet.getCell(`E${row}`).font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } };
  
  row++;
  summarySheet.getCell(`A${row}`).value = 'Total Subrequirements';
  summarySheet.getCell(`B${row}`).value = totalSubreqs;
  summarySheet.getCell(`B${row}`).font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } };
  summarySheet.getCell(`D${row}`).value = 'Highest Fitment';
  summarySheet.getCell(`E${row}`).value = maxFitment !== null ? `${maxFitment}%` : 'N/A';
  summarySheet.getCell(`E${row}`).font = { bold: true, size: 14, color: { argb: 'FF10B981' } };
  
  row++;
  summarySheet.getCell(`A${row}`).value = 'Avg Subreqs/Requirement';
  summarySheet.getCell(`B${row}`).value = totalRequirements > 0 ? (totalSubreqs / totalRequirements).toFixed(1) : '0';
  summarySheet.getCell(`B${row}`).font = { bold: true, size: 14, color: { argb: 'FF7C3AED' } };
  summarySheet.getCell(`D${row}`).value = 'Lowest Fitment';
  summarySheet.getCell(`E${row}`).value = minFitment !== null ? `${minFitment}%` : 'N/A';
  summarySheet.getCell(`E${row}`).font = { bold: true, size: 14, color: { argb: 'FFEF4444' } };
  
  // Apply background to metrics
  for (let r = metricsStartRow; r <= row; r++) {
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      summarySheet.getCell(`${col}${r}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
      summarySheet.getCell(`${col}${r}`).border = thinBorder;
    });
  }
  
  // Fitment Distribution Section with Chart Data
  row += 2;
  const fitmentDistStartRow = row;
  summarySheet.getCell(`A${row}`).value = 'FITMENT DISTRIBUTION';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:C${row}`);
  
  // Chart title on the right
  summarySheet.getCell(`G${row}`).value = '📊 FITMENT DISTRIBUTION CHART';
  summarySheet.getCell(`G${row}`).font = { bold: true, size: 11, color: { argb: 'FF5B21B6' } };
  summarySheet.mergeCells(`G${row}:J${row}`);
  
  row++;
  ['Range', 'Count', 'Percentage'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  // Chart header
  ['Category', 'Value', 'Bar'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 7);
    cell.value = header;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  const fitmentDistData = [
    ['High (≥80%)', highFitment, fitmentScores.length > 0 ? ((highFitment / fitmentScores.length) * 100) : 0, '10B981'],
    ['Medium (50-79%)', mediumFitment, fitmentScores.length > 0 ? ((mediumFitment / fitmentScores.length) * 100) : 0, 'F59E0B'],
    ['Low (<50%)', lowFitment, fitmentScores.length > 0 ? ((lowFitment / fitmentScores.length) * 100) : 0, 'EF4444']
  ];
  
  fitmentDistData.forEach((rowData, idx) => {
    row++;
    // Left table
    summarySheet.getCell(row, 1).value = rowData[0];
    summarySheet.getCell(row, 1).border = thinBorder;
    summarySheet.getCell(row, 1).alignment = { horizontal: 'left' };
    
    summarySheet.getCell(row, 2).value = rowData[1];
    summarySheet.getCell(row, 2).border = thinBorder;
    summarySheet.getCell(row, 2).alignment = { horizontal: 'center' };
    
    summarySheet.getCell(row, 3).value = `${(rowData[2] as number).toFixed(1)}%`;
    summarySheet.getCell(row, 3).border = thinBorder;
    summarySheet.getCell(row, 3).alignment = { horizontal: 'center' };
    
    if (idx % 2 === 0) {
      [1, 2, 3].forEach(c => summarySheet.getCell(row, c).fill = evenRowFill);
    }
    
    // Visual bar chart representation
    summarySheet.getCell(row, 7).value = rowData[0];
    summarySheet.getCell(row, 7).border = thinBorder;
    
    summarySheet.getCell(row, 8).value = rowData[1];
    summarySheet.getCell(row, 8).alignment = { horizontal: 'center' };
    summarySheet.getCell(row, 8).border = thinBorder;
    
    // Create visual bar using repeated characters
    const barLength = Math.round((rowData[2] as number) / 5);
    const barChar = '█';
    summarySheet.getCell(row, 9).value = barChar.repeat(Math.max(barLength, 1));
    summarySheet.getCell(row, 9).font = { color: { argb: `FF${rowData[3]}` } };
    summarySheet.getCell(row, 9).border = thinBorder;
    summarySheet.mergeCells(row, 9, row, 10);
  });
  
  // Status Distribution Section with Chart
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'STATUS DISTRIBUTION';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:C${row}`);
  
  // Chart title
  summarySheet.getCell(`G${row}`).value = '📊 STATUS DISTRIBUTION CHART';
  summarySheet.getCell(`G${row}`).font = { bold: true, size: 11, color: { argb: 'FF5B21B6' } };
  summarySheet.mergeCells(`G${row}:J${row}`);
  
  row++;
  ['Status', 'Count', 'Percentage'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  ['Status', 'Count', 'Visual'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 7);
    cell.value = header;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  const statusColors = ['7C3AED', '10B981', 'F59E0B', 'EF4444', '3B82F6', '8B5CF6'];
  Object.entries(statusCounts).forEach(([status, count], idx) => {
    row++;
    const pct = (count / totalRequirements) * 100;
    const rowData = [status, count, `${pct.toFixed(1)}%`];
    rowData.forEach((val, colIdx) => {
      const cell = summarySheet.getCell(row, colIdx + 1);
      cell.value = val;
      cell.border = thinBorder;
      cell.alignment = { horizontal: colIdx === 0 ? 'left' : 'center' };
      if (idx % 2 === 0) cell.fill = evenRowFill;
    });
    
    // Visual chart
    summarySheet.getCell(row, 7).value = status;
    summarySheet.getCell(row, 7).border = thinBorder;
    summarySheet.getCell(row, 8).value = count;
    summarySheet.getCell(row, 8).alignment = { horizontal: 'center' };
    summarySheet.getCell(row, 8).border = thinBorder;
    
    const barLength = Math.round(pct / 5);
    summarySheet.getCell(row, 9).value = '█'.repeat(Math.max(barLength, 1));
    summarySheet.getCell(row, 9).font = { color: { argb: `FF${statusColors[idx % statusColors.length]}` } };
    summarySheet.getCell(row, 9).border = thinBorder;
    summarySheet.mergeCells(row, 9, row, 10);
  });
  
  // Category Breakdown Section with Chart
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'CATEGORY BREAKDOWN';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:C${row}`);
  
  summarySheet.getCell(`G${row}`).value = '📊 CATEGORY DISTRIBUTION CHART';
  summarySheet.getCell(`G${row}`).font = { bold: true, size: 11, color: { argb: 'FF5B21B6' } };
  summarySheet.mergeCells(`G${row}:J${row}`);
  
  row++;
  ['Category', 'Count', 'Percentage'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  ['Category', 'Count', 'Visual'].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 7);
    cell.value = header;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  
  Object.entries(categoryCounts).forEach(([category, count], idx) => {
    row++;
    const pct = (count / totalRequirements) * 100;
    const rowData = [category, count, `${pct.toFixed(1)}%`];
    rowData.forEach((val, colIdx) => {
      const cell = summarySheet.getCell(row, colIdx + 1);
      cell.value = val;
      cell.border = thinBorder;
      cell.alignment = { horizontal: colIdx === 0 ? 'left' : 'center', wrapText: true };
      if (idx % 2 === 0) cell.fill = evenRowFill;
    });
    
    // Visual chart
    const shortCat = category.length > 20 ? category.substring(0, 20) + '...' : category;
    summarySheet.getCell(row, 7).value = shortCat;
    summarySheet.getCell(row, 7).border = thinBorder;
    summarySheet.getCell(row, 8).value = count;
    summarySheet.getCell(row, 8).alignment = { horizontal: 'center' };
    summarySheet.getCell(row, 8).border = thinBorder;
    
    const barLength = Math.round(pct / 5);
    summarySheet.getCell(row, 9).value = '█'.repeat(Math.max(barLength, 1));
    summarySheet.getCell(row, 9).font = { color: { argb: `FF${statusColors[idx % statusColors.length]}` } };
    summarySheet.getCell(row, 9).border = thinBorder;
    summarySheet.mergeCells(row, 9, row, 10);
  });
  
  // Fitment by Requirement Chart Data
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'FITMENT BY REQUIREMENT';
  summarySheet.getCell(`A${row}`).font = sectionHeaderFont;
  summarySheet.getCell(`A${row}`).fill = sectionHeaderFill;
  summarySheet.mergeCells(`A${row}:J${row}`);
  
  row++;
  ['Req ID', 'Category', 'Fitment %', 'Visual Bar', '', '', '', '', '', ''].forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 1);
    cell.value = header;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center' };
    cell.border = thinBorder;
  });
  summarySheet.mergeCells(row, 4, row, 10);
  
  data.items.forEach((item, idx) => {
    row++;
    summarySheet.getCell(row, 1).value = item.requirementId;
    summarySheet.getCell(row, 1).alignment = { horizontal: 'center' };
    summarySheet.getCell(row, 1).border = thinBorder;
    
    const shortCat = (item.category || 'Uncategorized').substring(0, 25);
    summarySheet.getCell(row, 2).value = shortCat;
    summarySheet.getCell(row, 2).border = thinBorder;
    
    summarySheet.getCell(row, 3).value = item.fitmentPercentage !== null ? `${item.fitmentPercentage}%` : 'N/A';
    summarySheet.getCell(row, 3).alignment = { horizontal: 'center' };
    summarySheet.getCell(row, 3).border = thinBorder;
    
    // Visual bar
    const fitment = item.fitmentPercentage || 0;
    const barLength = Math.round(fitment / 2.5);
    const barColor = fitment >= 80 ? '10B981' : fitment >= 50 ? 'F59E0B' : 'EF4444';
    summarySheet.getCell(row, 4).value = '█'.repeat(Math.max(barLength, 0)) + ` ${fitment}%`;
    summarySheet.getCell(row, 4).font = { color: { argb: `FF${barColor}` } };
    summarySheet.getCell(row, 4).border = thinBorder;
    summarySheet.mergeCells(row, 4, row, 10);
    
    if (idx % 2 === 0) {
      [1, 2, 3].forEach(c => summarySheet.getCell(row, c).fill = evenRowFill);
    }
  });

  // === SHEET 3: Features & Gaps ===
  const featuresSheet = workbook.addWorksheet('Features & Gaps', {
    properties: { tabColor: { argb: 'FF10B981' } }
  });
  
  featuresSheet.columns = [
    { header: 'Req ID', key: 'id', width: 12 },
    { header: 'Requirement', key: 'requirement', width: 50 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Fitment', key: 'fitment', width: 12 },
    { header: 'Available Features', key: 'features', width: 55 },
    { header: 'Gaps / Customizations', key: 'gaps', width: 55 }
  ];
  
  featuresSheet.getRow(1).eachCell(cell => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  featuresSheet.getRow(1).height = 25;
  
  data.items.forEach((item, idx) => {
    const rowData = {
      id: item.requirementId,
      requirement: item.requirementText,
      category: item.category || 'Uncategorized',
      status: item.ekgStatus || 'N/A',
      fitment: item.fitmentPercentage !== null ? `${item.fitmentPercentage}%` : 'N/A',
      features: item.availableFeatures.length > 0 ? '• ' + item.availableFeatures.join('\n• ') : 'None',
      gaps: item.gapsCustomizations.length > 0 ? '• ' + item.gapsCustomizations.join('\n• ') : 'None'
    };
    
    const dataRow = featuresSheet.addRow(rowData);
    dataRow.height = 60;
    
    dataRow.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
      if (idx % 2 === 0) cell.fill = evenRowFill;
    });
  });

  // === SHEET 4: Subrequirements ===
  const subreqSheet = workbook.addWorksheet('Subrequirements', {
    properties: { tabColor: { argb: 'FFF59E0B' } }
  });
  
  subreqSheet.columns = [
    { header: 'Req ID', key: 'reqId', width: 12 },
    { header: 'Requirement', key: 'requirement', width: 45 },
    { header: 'Sub-Req ID', key: 'srId', width: 12 },
    { header: 'Sub-Req Title', key: 'srTitle', width: 40 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'Fitment', key: 'fitment', width: 10 },
    { header: 'Integration', key: 'integration', width: 12 },
    { header: 'Reporting', key: 'reporting', width: 12 },
    { header: 'Customization', key: 'customization', width: 45 }
  ];
  
  subreqSheet.getRow(1).eachCell(cell => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  subreqSheet.getRow(1).height = 25;
  
  let srRowIdx = 0;
  data.items.forEach(item => {
    if (item.subrequirements.length > 0) {
      item.subrequirements.forEach((sr, srIdx) => {
        const rowData = {
          reqId: srIdx === 0 ? item.requirementId : '',
          requirement: srIdx === 0 ? item.requirementText : '',
          srId: sr.id,
          srTitle: sr.title,
          status: sr.status,
          weight: sr.weight !== null ? sr.weight : '—',
          fitment: sr.fitment !== null ? `${sr.fitment}%` : '—',
          integration: sr.integrationRelated ? 'Yes' : '—',
          reporting: sr.reportingRelated ? 'Yes' : '—',
          customization: sr.customizationNotes || '—'
        };
        
        const dataRow = subreqSheet.addRow(rowData);
        dataRow.height = 35;
        
        dataRow.eachCell(cell => {
          cell.alignment = { vertical: 'top', wrapText: true };
          cell.border = thinBorder;
          if (srRowIdx % 2 === 0) cell.fill = evenRowFill;
        });
        srRowIdx++;
      });
    }
  });

  // === SHEET 5: Detailed View ===
  const detailedSheet = workbook.addWorksheet('Detailed View', {
    properties: { tabColor: { argb: 'FFEF4444' } }
  });
  
  detailedSheet.columns = [
    { width: 25 }, { width: 50 }, { width: 18 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 45 }
  ];
  
  let detailRow = 1;
  
  data.items.forEach((item, itemIdx) => {
    // Requirement Header
    detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
    const reqHeaderCell = detailedSheet.getCell(`A${detailRow}`);
    reqHeaderCell.value = `REQUIREMENT ${itemIdx + 1}: ID ${item.requirementId}`;
    reqHeaderCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    reqHeaderCell.fill = headerFill;
    reqHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    detailedSheet.getRow(detailRow).height = 28;
    detailRow++;
    
    detailedSheet.getCell(`A${detailRow}`).value = 'Requirement:';
    detailedSheet.getCell(`A${detailRow}`).font = { bold: true, color: { argb: 'FF6B7280' } };
    detailedSheet.mergeCells(`B${detailRow}:H${detailRow}`);
    detailedSheet.getCell(`B${detailRow}`).value = item.requirementText;
    detailedSheet.getCell(`B${detailRow}`).alignment = { wrapText: true };
    detailRow++;
    
    detailedSheet.getCell(`A${detailRow}`).value = 'Category:';
    detailedSheet.getCell(`A${detailRow}`).font = { bold: true, color: { argb: 'FF6B7280' } };
    detailedSheet.getCell(`B${detailRow}`).value = item.category || 'Uncategorized';
    detailedSheet.getCell(`D${detailRow}`).value = 'Status:';
    detailedSheet.getCell(`D${detailRow}`).font = { bold: true, color: { argb: 'FF6B7280' } };
    detailedSheet.getCell(`E${detailRow}`).value = item.ekgStatus || 'N/A';
    detailedSheet.getCell(`G${detailRow}`).value = 'Fitment:';
    detailedSheet.getCell(`G${detailRow}`).font = { bold: true, color: { argb: 'FF6B7280' } };
    detailedSheet.getCell(`H${detailRow}`).value = item.fitmentPercentage !== null ? `${item.fitmentPercentage}%` : 'N/A';
    detailedSheet.getCell(`H${detailRow}`).font = { bold: true, color: { argb: 'FF7C3AED' } };
    detailRow += 2;
    
    // Section 1: Response
    detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
    const sec1Cell = detailedSheet.getCell(`A${detailRow}`);
    sec1Cell.value = 'SECTION 1: RESPONSE';
    sec1Cell.font = sectionHeaderFont;
    sec1Cell.fill = sectionHeaderFill;
    detailRow++;
    
    detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
    const responseCell = detailedSheet.getCell(`A${detailRow}`);
    responseCell.value = item.response || 'No response generated';
    responseCell.alignment = { wrapText: true, vertical: 'top' };
    detailedSheet.getRow(detailRow).height = 80;
    detailRow += 2;
    
    // Section 2: Features & Gaps
    detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
    const sec2Cell = detailedSheet.getCell(`A${detailRow}`);
    sec2Cell.value = 'SECTION 2: AVAILABLE FEATURES AND GAPS';
    sec2Cell.font = sectionHeaderFont;
    sec2Cell.fill = sectionHeaderFill;
    detailRow++;
    
    detailedSheet.getCell(`A${detailRow}`).value = 'Available Features:';
    detailedSheet.getCell(`A${detailRow}`).font = { bold: true };
    detailedSheet.getCell(`E${detailRow}`).value = 'Gaps / Customizations:';
    detailedSheet.getCell(`E${detailRow}`).font = { bold: true };
    detailRow++;
    
    const maxLen = Math.max(item.availableFeatures.length, item.gapsCustomizations.length, 1);
    for (let i = 0; i < maxLen; i++) {
      if (item.availableFeatures[i]) {
        detailedSheet.mergeCells(`A${detailRow}:D${detailRow}`);
        detailedSheet.getCell(`A${detailRow}`).value = `• ${item.availableFeatures[i]}`;
        detailedSheet.getCell(`A${detailRow}`).alignment = { wrapText: true };
      }
      if (item.gapsCustomizations[i]) {
        detailedSheet.mergeCells(`E${detailRow}:H${detailRow}`);
        detailedSheet.getCell(`E${detailRow}`).value = `• ${item.gapsCustomizations[i]}`;
        detailedSheet.getCell(`E${detailRow}`).alignment = { wrapText: true };
      }
      detailRow++;
    }
    if (item.availableFeatures.length === 0 && item.gapsCustomizations.length === 0) {
      detailedSheet.getCell(`A${detailRow}`).value = 'None';
      detailedSheet.getCell(`E${detailRow}`).value = 'None';
      detailRow++;
    }
    detailRow++;
    
    // Section 3: Subrequirements
    detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
    const sec3Cell = detailedSheet.getCell(`A${detailRow}`);
    sec3Cell.value = 'SECTION 3: SUBREQUIREMENTS';
    sec3Cell.font = sectionHeaderFont;
    sec3Cell.fill = sectionHeaderFill;
    detailRow++;
    
    if (item.subrequirements.length > 0) {
      const tableHeaders = ['ID', 'Title', 'Status', 'Weight', 'Fitment', 'Integration', 'Reporting', 'Customization'];
      tableHeaders.forEach((header, idx) => {
        const cell = detailedSheet.getCell(detailRow, idx + 1);
        cell.value = header;
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = thinBorder;
      });
      detailRow++;
      
      item.subrequirements.forEach((sr, srIdx) => {
        const srData = [
          sr.id, sr.title, sr.status,
          sr.weight !== null ? sr.weight : '—',
          sr.fitment !== null ? `${sr.fitment}%` : '—',
          sr.integrationRelated ? 'Yes' : '—',
          sr.reportingRelated ? 'Yes' : '—',
          sr.customizationNotes || '—'
        ];
        srData.forEach((val, idx) => {
          const cell = detailedSheet.getCell(detailRow, idx + 1);
          cell.value = val;
          cell.alignment = { vertical: 'top', wrapText: true };
          cell.border = thinBorder;
          if (srIdx % 2 === 0) cell.fill = evenRowFill;
        });
        detailRow++;
      });
    } else {
      detailedSheet.getCell(`A${detailRow}`).value = 'No subrequirements for this requirement';
      detailedSheet.getCell(`A${detailRow}`).font = { italic: true, color: { argb: 'FF9CA3AF' } };
      detailRow++;
    }
    
    if (itemIdx < data.items.length - 1) {
      detailRow++;
      detailedSheet.mergeCells(`A${detailRow}:H${detailRow}`);
      detailedSheet.getCell(`A${detailRow}`).border = {
        bottom: { style: 'medium', color: { argb: 'FF7C3AED' } }
      };
      detailRow += 2;
    }
  });

  // === SHEET 6: Event Mapping ===
  const eventSheet = workbook.addWorksheet('Event Mapping', {
    properties: { tabColor: { argb: 'FF3B82F6' } }
  });
  
  eventSheet.columns = [
    { header: 'Req ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Requirement', key: 'requirement', width: 50 },
    { header: 'Event 1', key: 'event1', width: 35 },
    { header: 'Event 2', key: 'event2', width: 35 },
    { header: 'Event 3', key: 'event3', width: 35 }
  ];
  
  eventSheet.getRow(1).eachCell(cell => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  eventSheet.getRow(1).height = 25;
  
  // Add event mapping data from original items if available
  if (data.originalItems) {
    data.originalItems.forEach((item, idx) => {
      const eventMappings = item.eventMappings;
      let events: string[] = ['Unmapped', 'Unmapped', 'Unmapped'];
      
      if (eventMappings) {
        try {
          const parsed = typeof eventMappings === 'string' ? JSON.parse(eventMappings) : eventMappings;
          ['event1', 'event2', 'event3'].forEach((key, i) => {
            const evt = parsed[key];
            if (evt) {
              const name = typeof evt === 'string' ? evt : evt.name || evt.event || '';
              const conf = evt.confidence;
              events[i] = conf ? `${name} (${Number(conf).toFixed(2)})` : name || 'Unmapped';
            }
          });
        } catch (e) {
          // Keep default
        }
      }
      
      const rowData = {
        id: item.id,
        category: item.category || 'Uncategorized',
        requirement: item.requirement || '',
        event1: events[0],
        event2: events[1],
        event3: events[2]
      };
      
      const dataRow = eventSheet.addRow(rowData);
      dataRow.height = 35;
      
      dataRow.eachCell(cell => {
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = thinBorder;
        if (idx % 2 === 0) cell.fill = evenRowFill;
      });
    });
  } else {
    // Use items from data
    data.items.forEach((item, idx) => {
      const rowData = {
        id: item.requirementId,
        category: item.category || 'Uncategorized',
        requirement: item.requirementText,
        event1: 'N/A',
        event2: 'N/A',
        event3: 'N/A'
      };
      
      const dataRow = eventSheet.addRow(rowData);
      dataRow.height = 35;
      
      dataRow.eachCell(cell => {
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = thinBorder;
        if (idx % 2 === 0) cell.fill = evenRowFill;
      });
    });
  }

  // === SHEET 7: RFP Responses (Excel format) ===
  const responsesSheet = workbook.addWorksheet('RFP Responses', {
    properties: { tabColor: { argb: 'FF8B5CF6' } }
  });
  
  responsesSheet.columns = [
    { header: 'Req ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Requirement', key: 'requirement', width: 50 },
    { header: 'Final Response', key: 'response', width: 100 }
  ];
  
  responsesSheet.getRow(1).eachCell(cell => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  responsesSheet.getRow(1).height = 25;
  
  data.items.forEach((item, idx) => {
    // Strip markdown from response for clean Excel export
    const cleanResponse = item.response
      .replace(/^#+\s+(.+)$/gm, '$1')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^\s*[-*]\s+(.+)$/gm, '• $1')
      .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')
      .replace(/^---+$/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim();
    
    const rowData = {
      id: item.requirementId,
      category: item.category || 'Uncategorized',
      requirement: item.requirementText,
      response: cleanResponse || 'No response'
    };
    
    const dataRow = responsesSheet.addRow(rowData);

    dataRow.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = thinBorder;
      if (idx % 2 === 0) cell.fill = evenRowFill;
    });
  });

  // === Apply Auto-fit to all worksheets ===
  // Skip row 1 (header) for data sheets, apply from row 2
  autoFitRows(tocSheet, 1);
  autoFitRows(summarySheet, 1);
  autoFitRows(featuresSheet, 2);  // Skip header row
  autoFitRows(subreqSheet, 2);    // Skip header row
  autoFitRows(detailedSheet, 1);
  autoFitRows(eventSheet, 2);     // Skip header row
  autoFitRows(responsesSheet, 2); // Skip header row

  return workbook;
};

/**
 * Downloads multiple EKG Assessments as a professionally styled Excel file
 * Uses ExcelJS for full formatting support
 */
export const downloadMultiEkgAssessmentExcel = async (
  data: MultiEkgExportData,
  filename = "ekg-assessments.xlsx"
): Promise<void> => {
  showNotification("Preparing EKG Assessments export...", "loading");
  
  try {
    const workbook = await generateMultiEkgAssessmentExcelJS(data);
    
    // Generate buffer and create blob for download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`${data.items.length} EKG Assessments exported successfully!`, "success");
  } catch (error) {
    console.error("Error generating multi EKG Assessment Excel:", error);
    showNotification(
      `Failed to export EKG Assessments: ${error instanceof Error ? error.message : "Unknown error"}`,
      "error"
    );
  }
};
