const axios = require('axios');

// ──────────────────────────────────────────────────────────────────────────────
// Conversor número → letras en español (para importeEnLetras)
// ──────────────────────────────────────────────────────────────────────────────
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
    'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function _intToWords(n) {
    if (n === 0) return 'CERO';
    if (n <= 20) return UNIDADES[n];
    if (n < 100) {
        const dec = Math.floor(n / 10);
        const uni = n % 10;
        if (uni === 0) return DECENAS[dec];
        if (dec === 2) return 'VEINTI' + UNIDADES[uni];
        return DECENAS[dec] + ' Y ' + UNIDADES[uni];
    }
    if (n < 1000) {
        const cen = Math.floor(n / 100);
        const resto = n % 100;
        if (resto === 0) return CENTENAS[cen];
        if (cen === 1) return 'CIENTO ' + _intToWords(resto);
        return CENTENAS[cen] + ' ' + _intToWords(resto);
    }
    if (n < 1000000) {
        const miles = Math.floor(n / 1000);
        const resto = n % 1000;
        const milesStr = miles === 1 ? 'MIL' : _intToWords(miles) + ' MIL';
        if (resto === 0) return milesStr;
        return milesStr + ' ' + _intToWords(resto);
    }
    return n.toString();
}

function amountToWords(amount) {
    const total = Math.round(amount * 100);
    const enteros = Math.floor(total / 100);
    const centavos = total % 100;
    return `${_intToWords(enteros)} CON ${String(centavos).padStart(2, '0')}/100 SOLES`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Construye el payload UBL 2.1 para APISUNAT
// ──────────────────────────────────────────────────────────────────────────────
function buildInvoicePayload({ company, invoice, details }) {
    const typeCode = invoice.type === 'FACTURA' ? '01' : '03';
    const serieStr = String(invoice.serie || (invoice.type === 'FACTURA' ? 'F001' : 'B001'));
    const corrStr = String(invoice.correlativo || 1).padStart(8, '0');
    const fileName = `${company.taxId}-${typeCode}-${serieStr}-${corrStr}`;

    const fechaEmision = invoice.fechaEmision
        ? new Date(invoice.fechaEmision).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const items = (details || []).map((d, idx) => ({
        id: idx + 1,
        descripcion: d.nombreProducto,
        cantidad: d.cantidad,
        unidad: 'ZZ',
        codigoProducto: d.itemCodigo || String(d.id),
        precioUnitario: parseFloat((d.precioUnitario || 0).toFixed(2)),
        precioUnitarioConIgv: parseFloat((d.precioConIgv / (d.cantidad || 1)).toFixed(2)),
        igv: parseFloat((d.igv || 0).toFixed(2)),
        totalVenta: parseFloat((d.precioConIgv || 0).toFixed(2))
    }));

    return {
        fileName,
        tipoDocumento: typeCode,
        serie: serieStr,
        correlativo: corrStr,
        fechaEmision,
        formaPago: invoice.formaPago || 'CONTADO',
        moneda: 'PEN',
        empresa: {
            ruc: company.taxId,
            razonSocial: company.name,
            nombreComercial: company.commercialName || company.name,
            direccion: company.address || ''
        },
        cliente: {
            tipoDocumento: invoice.tipoDocumento === 'RUC' ? '6' : '1',
            numeroDocumento: invoice.nroDocumento || '',
            razonSocial: invoice.razonSocial || '',
            direccion: invoice.direccionCliente || ''
        },
        totales: {
            totalGravadas: parseFloat((invoice.montoSinIgv || 0).toFixed(2)),
            totalIgv: parseFloat((invoice.igv || 0).toFixed(2)),
            importeTotal: parseFloat((invoice.montoConIgv || 0).toFixed(2)),
            importeEnLetras: invoice.importeEnLetras || amountToWords(invoice.montoConIgv || 0)
        },
        items
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Envía a APISUNAT
// ──────────────────────────────────────────────────────────────────────────────
async function sendToApisunat({ personaId, personaToken, payload }) {
    const url = process.env.APISUNAT_URL || 'https://api.apisunat.com/v1/invoices';
    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'personaId': personaId,
            'personaToken': personaToken
        },
        timeout: 15000
    });
    return response.data;
}

module.exports = { amountToWords, buildInvoicePayload, sendToApisunat };
