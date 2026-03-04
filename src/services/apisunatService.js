'use strict';

// ─── Number to Spanish words ─────────────────────────────────────────────────

const _units = [
    '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
    'DIECIOCHO', 'DIECINUEVE'
];
const _tens  = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const _hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function _intToWords(n) {
    if (n === 0) return 'CERO';
    if (n < 20)  return _units[n];
    if (n < 100) {
        const t = Math.floor(n / 10), u = n % 10;
        if (n >= 21 && n <= 29) return 'VEINTI' + (u > 0 ? _units[u] : '');
        return _tens[t] + (u > 0 ? ' Y ' + _units[u] : '');
    }
    if (n < 1000) {
        const h = Math.floor(n / 100), rest = n % 100;
        const hStr = (h === 1 && rest > 0) ? 'CIENTO' : _hundreds[h];
        return hStr + (rest > 0 ? ' ' + _intToWords(rest) : '');
    }
    if (n < 1000000) {
        const t = Math.floor(n / 1000), rest = n % 1000;
        const tStr = t === 1 ? 'MIL' : _intToWords(t) + ' MIL';
        return tStr + (rest > 0 ? ' ' + _intToWords(rest) : '');
    }
    return String(n);
}

function amountToWords(amount) {
    const fixed = parseFloat(amount).toFixed(2);
    const [intStr, decStr] = fixed.split('.');
    return `${_intToWords(parseInt(intStr))} CON ${decStr}/100 SOLES`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function docSchemeId(docType) {
    const map = { DNI: '1', RUC: '6', CE: '4', PASAPORTE: '7' };
    return map[(docType || '').toUpperCase()] || '1';
}

function invoiceTypeCode(type) {
    return type === 'FACTURA' ? '01' : '03';
}

// ─── Payload builder ─────────────────────────────────────────────────────────

/**
 * Builds the APISUNAT UBL 2.1 JSON payload.
 *
 * @param {object} opts
 * @param {object} opts.company       - Company record (taxId, name, commercialName, address, apisunatPersonaId, apisunatPersonaToken)
 * @param {object} opts.invoice       - Invoice record (serie, correlativo, type, subtotal, igv, total, createdAt)
 * @param {object} opts.customer      - Billing customer data (customerName, documentType, documentId, address)
 * @param {Array}  opts.items         - TreatmentItem[] with .service, .price, .quantity, .discount
 */
function buildInvoicePayload({ company, invoice, customer, items }) {
    const typeCode   = invoiceTypeCode(invoice.type);
    const serie      = invoice.serie;
    const corrPad    = String(invoice.correlativo).padStart(8, '0');
    const fullNumber = `${serie}-${corrPad}`;
    const fileName   = `${company.taxId}-${typeCode}-${fullNumber}`;

    const now       = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
    const issueDate = now.toISOString().split('T')[0];
    const issueTime = now.toISOString().split('T')[1].split('.')[0];

    const subtotal = parseFloat(invoice.subtotal || 0);
    const igv      = parseFloat(invoice.igv || 0);
    const total    = parseFloat(invoice.total);

    // ── Invoice lines ──────────────────────────────────────────────────────
    const invoiceLines = (items || []).map((item, idx) => {
        const unitPrice  = parseFloat(item.price) * (1 - (item.discount || 0) / 100);
        const qty        = parseInt(item.quantity) || 1;
        const lineBase   = parseFloat((unitPrice / 1.18 * qty).toFixed(2));
        const lineIgv    = parseFloat((lineBase * 0.18).toFixed(2));
        const lineTotal  = parseFloat((lineBase + lineIgv).toFixed(2));
        const unitBase   = parseFloat((unitPrice / 1.18).toFixed(2));

        return {
            "cbc:ID": { "_text": idx + 1 },
            "cbc:InvoicedQuantity": {
                "_attributes": { "unitCode": "NIU" },
                "_text": qty
            },
            "cbc:LineExtensionAmount": {
                "_attributes": { "currencyID": "PEN" },
                "_text": lineBase
            },
            "cac:PricingReference": {
                "cac:AlternativeConditionPrice": {
                    "cbc:PriceAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": lineTotal
                    },
                    "cbc:PriceTypeCode": { "_text": "01" }
                }
            },
            "cac:TaxTotal": {
                "cbc:TaxAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": lineIgv
                },
                "cac:TaxSubtotal": [{
                    "cbc:TaxableAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": lineBase
                    },
                    "cbc:TaxAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": lineIgv
                    },
                    "cac:TaxCategory": {
                        "cbc:Percent": { "_text": 18 },
                        "cbc:TaxExemptionReasonCode": { "_text": "10" },
                        "cac:TaxScheme": {
                            "cbc:ID":          { "_text": "1000" },
                            "cbc:Name":        { "_text": "IGV"  },
                            "cbc:TaxTypeCode": { "_text": "VAT"  }
                        }
                    }
                }]
            },
            "cac:Item": {
                "cbc:Description": {
                    "_text": item.service?.name || 'Servicio dental'
                }
            },
            "cac:Price": {
                "cbc:PriceAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": unitBase
                }
            }
        };
    });

    // ── Customer party ─────────────────────────────────────────────────────
    const customerParty = {
        "cac:Party": {
            "cac:PartyIdentification": {
                "cbc:ID": {
                    "_attributes": { "schemeID": docSchemeId(customer.documentType) },
                    "_text": customer.documentId || '00000000'
                }
            },
            "cac:PartyLegalEntity": {
                "cbc:RegistrationName": {
                    "_text": customer.customerName || 'CLIENTE VARIOS'
                },
                ...(customer.address ? {
                    "cac:RegistrationAddress": {
                        "cac:AddressLine": {
                            "cbc:Line": { "_text": customer.address }
                        }
                    }
                } : {})
            }
        }
    };

    // ── Full payload ───────────────────────────────────────────────────────
    return {
        personaId:    company.apisunatPersonaId,
        personaToken: company.apisunatPersonaToken,
        fileName,
        documentBody: {
            "cbc:UBLVersionID":    { "_text": "2.1" },
            "cbc:CustomizationID": { "_text": "2.0" },
            "cbc:ID":              { "_text": fullNumber },
            "cbc:IssueDate":       { "_text": issueDate },
            "cbc:IssueTime":       { "_text": issueTime },
            "cbc:InvoiceTypeCode": {
                "_attributes": { "listID": "0101" },
                "_text": typeCode
            },
            "cbc:Note": [{
                "_text": amountToWords(total),
                "_attributes": { "languageLocaleID": "1000" }
            }],
            "cbc:DocumentCurrencyCode": { "_text": "PEN" },

            "cac:AccountingSupplierParty": {
                "cac:Party": {
                    "cac:PartyIdentification": {
                        "cbc:ID": {
                            "_attributes": { "schemeID": "6" },
                            "_text": company.taxId
                        }
                    },
                    "cac:PartyName": {
                        "cbc:Name": { "_text": company.commercialName || company.name }
                    },
                    "cac:PartyLegalEntity": {
                        "cbc:RegistrationName": { "_text": company.name },
                        "cac:RegistrationAddress": {
                            "cbc:AddressTypeCode": { "_text": "0000" },
                            "cac:AddressLine": {
                                "cbc:Line": { "_text": company.address || '' }
                            }
                        }
                    }
                }
            },

            "cac:AccountingCustomerParty": customerParty,

            "cac:TaxTotal": {
                "cbc:TaxAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": parseFloat(igv.toFixed(2))
                },
                "cac:TaxSubtotal": [{
                    "cbc:TaxableAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": parseFloat(subtotal.toFixed(2))
                    },
                    "cbc:TaxAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": parseFloat(igv.toFixed(2))
                    },
                    "cac:TaxCategory": {
                        "cac:TaxScheme": {
                            "cbc:ID":          { "_text": "1000" },
                            "cbc:Name":        { "_text": "IGV"  },
                            "cbc:TaxTypeCode": { "_text": "VAT"  }
                        }
                    }
                }]
            },

            "cac:LegalMonetaryTotal": {
                "cbc:LineExtensionAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": parseFloat(subtotal.toFixed(2))
                },
                "cbc:TaxInclusiveAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": parseFloat(total.toFixed(2))
                },
                "cbc:PayableAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": parseFloat(total.toFixed(2))
                }
            },

            "cac:PaymentTerms": [{
                "cbc:ID":              { "_text": "FormaPago" },
                "cbc:PaymentMeansID": { "_text": "Contado"   }
            }],

            "cac:InvoiceLine": invoiceLines
        }
    };
}

// ─── HTTP call ────────────────────────────────────────────────────────────────

async function sendToApisunat(payload) {
    const url = process.env.APISUNAT_URL;
    if (!url) throw new Error('APISUNAT_URL no está configurado en .env');

    const response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
    });

    let data;
    try { data = await response.json(); } catch { data = {}; }

    return { ok: response.ok, status: response.status, data };
}

module.exports = { buildInvoicePayload, sendToApisunat, amountToWords };
