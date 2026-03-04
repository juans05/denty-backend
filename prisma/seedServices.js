/**
 * Seed de Servicios Dentales
 * ─────────────────────────────────────────────────────────────────────────────
 * Catálogo clínico profesional con precios en Soles (PEN) — mercado peruano 2025-2026.
 * Basado en estándares de clínicas privadas de nivel medio-alto (Lima y provincias).
 *
 * Ejecución:
 *   node prisma/seedServices.js
 *
 * Características:
 *   - Idempotente: no duplica servicios existentes (compara por nombre + categoría + companyId)
 *   - Aplica a TODAS las empresas registradas en la base de datos
 *   - Seguro para correr en producción
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Catálogo de servicios dentales ──────────────────────────────────────────
// Campos: name, category, description, price (S/.), duration (minutos)
const DENTAL_SERVICES = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONSULTAS Y DIAGNÓSTICO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Consulta y Diagnóstico General',
    category: 'CONSULTAS Y DIAGNÓSTICO',
    description: 'Evaluación clínica completa de la salud bucal, revisión de tejidos blandos y duros, diagnóstico y plan de tratamiento.',
    price: 50,
    duration: 30,
  },
  {
    name: 'Consulta de Urgencia / Emergencia',
    category: 'CONSULTAS Y DIAGNÓSTICO',
    description: 'Atención inmediata para dolor agudo, fractura dental, trauma o infección. Incluye diagnóstico y manejo de la urgencia.',
    price: 60,
    duration: 30,
  },
  {
    name: 'Segunda Opinión Diagnóstica',
    category: 'CONSULTAS Y DIAGNÓSTICO',
    description: 'Revisión y evaluación del diagnóstico previo realizado por otro profesional, con emisión de informe.',
    price: 60,
    duration: 45,
  },
  {
    name: 'Consulta de Seguimiento / Control',
    category: 'CONSULTAS Y DIAGNÓSTICO',
    description: 'Control post-tratamiento para verificar evolución y cicatrización. Sin costo de diagnóstico adicional.',
    price: 30,
    duration: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RADIOLOGÍA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Radiografía Periapical (1 placa)',
    category: 'RADIOLOGÍA',
    description: 'Radiografía digital intraoral que muestra la totalidad de una pieza dental incluyendo el ápice radicular. Ideal para diagnóstico de caries, lesiones periapicales y endodoncia.',
    price: 25,
    duration: 10,
  },
  {
    name: 'Radiografía Aleta de Mordida (Bitewing)',
    category: 'RADIOLOGÍA',
    description: 'Placa radiográfica para detección de caries interproximales y evaluación del nivel de hueso alveolar. Se toma en pares (derecha e izquierda).',
    price: 30,
    duration: 10,
  },
  {
    name: 'Radiografía Panorámica (OPG)',
    category: 'RADIOLOGÍA',
    description: 'Radiografía extraoral que muestra ambas arcadas, articulación temporomandibular (ATM), senos maxilares y estructuras óseas. Imprescindible para planificación quirúrgica y de implantes.',
    price: 100,
    duration: 15,
  },
  {
    name: 'Radiografía Cefalométrica Lateral',
    category: 'RADIOLOGÍA',
    description: 'Radiografía de perfil del cráneo utilizada para análisis cefalométrico en ortodoncia. Permite evaluar relaciones esqueléticas y dentales.',
    price: 100,
    duration: 15,
  },
  {
    name: 'Tomografía Cone Beam (CBCT) - 1 Sector',
    category: 'RADIOLOGÍA',
    description: 'Tomografía computada de haz cónico para evaluación en 3D de un sector específico. Ideal para planificación de implantes, cirugía y endodoncia compleja.',
    price: 250,
    duration: 20,
  },
  {
    name: 'Tomografía Cone Beam (CBCT) - Arcada Completa',
    category: 'RADIOLOGÍA',
    description: 'Tomografía computada de haz cónico de ambas arcadas completas. Para planificación de casos complejos de implantes, ortodoncia quirúrgica o cirugía maxilofacial.',
    price: 380,
    duration: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PREVENTIVA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Profilaxis Dental (Limpieza Profesional)',
    category: 'PREVENTIVA',
    description: 'Remoción de placa bacteriana, cálculo supragingival y manchas extrínsecas mediante ultrasonido y copa de pulido con pasta profiláctica. Incluye enseñanza de higiene oral.',
    price: 100,
    duration: 45,
  },
  {
    name: 'Destartraje Supragingival (Detartraje)',
    category: 'PREVENTIVA',
    description: 'Eliminación de cálculo dental (sarro) de las superficies supragingivales mediante instrumental ultrasónico. Indicado en casos de acumulación moderada a severa.',
    price: 120,
    duration: 45,
  },
  {
    name: 'Fluorización Tópica con Barniz',
    category: 'PREVENTIVA',
    description: 'Aplicación tópica de barniz de flúor de alta concentración para remineralización del esmalte y prevención de caries. Ideal para niños, adultos con riesgo alto y pacientes con ortodoncia.',
    price: 50,
    duration: 20,
  },
  {
    name: 'Sellante de Fosas y Fisuras (por pieza)',
    category: 'PREVENTIVA',
    description: 'Aplicación de resina fluida en las fisuras de molares y premolares para prevenir caries. Se recomienda en piezas permanentes recién erupcionadas.',
    price: 55,
    duration: 20,
  },
  {
    name: 'Instrucción de Higiene Oral',
    category: 'PREVENTIVA',
    description: 'Sesión educativa personalizada sobre técnicas de cepillado, uso de hilo dental, revelador de placa e higiene interdental. Incluye análisis de índice de placa.',
    price: 40,
    duration: 30,
  },
  {
    name: 'Profilaxis + Fluorización (Pack Preventivo)',
    category: 'PREVENTIVA',
    description: 'Paquete combinado de limpieza profesional ultrasónica con pulido más aplicación de barniz de flúor. Recomendado cada 6 meses.',
    price: 140,
    duration: 60,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. OPERATORIA DENTAL (RESTAURACIONES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Restauración de Resina Compuesta - 1 Cara',
    category: 'OPERATORIA DENTAL',
    description: 'Obturación con resina compuesta fotopolimerizable en una superficie dental (oclusal, vestibular, lingual o proximal). Estética y resistente. Indicada para caries incipientes.',
    price: 90,
    duration: 45,
  },
  {
    name: 'Restauración de Resina Compuesta - 2 Caras',
    category: 'OPERATORIA DENTAL',
    description: 'Obturación con resina compuesta que involucra dos superficies dentales (ej. ocluso-mesial o ocluso-distal). Mayor complejidad técnica y estética.',
    price: 120,
    duration: 60,
  },
  {
    name: 'Restauración de Resina Compuesta - 3 Caras',
    category: 'OPERATORIA DENTAL',
    description: 'Obturación amplia con resina compuesta que involucra tres o más superficies. Requiere técnica incremental y mayor tiempo clínico. Para caries extensas.',
    price: 160,
    duration: 75,
  },
  {
    name: 'Restauración de Resina en Sector Anterior (Diente Anterior)',
    category: 'OPERATORIA DENTAL',
    description: 'Restauración estética en piezas anteriores (incisivos y caninos) con resina de alta traslucidez. Incluye caracterización cromática para resultado natural.',
    price: 140,
    duration: 60,
  },
  {
    name: 'Restauración con Amalgama - 1 a 2 Caras',
    category: 'OPERATORIA DENTAL',
    description: 'Obturación con aleación de amalgama de plata en piezas posteriores. Indicada cuando no es posible aislar adecuadamente o como material de base.',
    price: 80,
    duration: 45,
  },
  {
    name: 'Incrustación de Resina (Inlay/Onlay)',
    category: 'OPERATORIA DENTAL',
    description: 'Restauración indirecta fabricada en laboratorio con resina de alta densidad. Mayor resistencia y estética que resinas directas. Para caries extensas en posteriores.',
    price: 350,
    duration: 60,
  },
  {
    name: 'Incrustación Cerámica (Inlay/Onlay Cerámico)',
    category: 'OPERATORIA DENTAL',
    description: 'Restauración indirecta de cerámica feldespática o de disilicato de litio fabricada por laboratorio. Máxima estética y durabilidad. Para restauraciones visibles en posteriores.',
    price: 550,
    duration: 60,
  },
  {
    name: 'Reconstrucción Coronal con Poste de Fibra',
    category: 'OPERATORIA DENTAL',
    description: 'Reconstrucción de la corona dental utilizando poste de fibra de vidrio prefabricado y resina compuesta. Previa a la colocación de corona protésica. Para piezas endodonciadas.',
    price: 180,
    duration: 60,
  },
  {
    name: 'Tratamiento de Sensibilidad Dental (por sesión)',
    category: 'OPERATORIA DENTAL',
    description: 'Aplicación de agentes desensibilizantes (barniz de flúor, oxalatos, adhesivos) sobre superficies con hipersensibilidad dentinaria. Puede requerir varias sesiones.',
    price: 70,
    duration: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ENDODONCIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Tratamiento de Conductos - Unirradicular (Pieza Anterior)',
    category: 'ENDODONCIA',
    description: 'Tratamiento de conducto radicular en piezas unirradiculares (incisivos, caninos). Incluye acceso, instrumentación biomecánica, irrigación, medicación intraconducto y obturación con gutapercha. Se realiza en 1-2 sesiones.',
    price: 320,
    duration: 90,
  },
  {
    name: 'Tratamiento de Conductos - Birradicular (Premolar)',
    category: 'ENDODONCIA',
    description: 'Tratamiento de conducto radicular en premolares con dos conductos. Mayor complejidad anatómica. Incluye instrumentación rotatoria, irrigación con hipoclorito y obturación termoplástica. 1-2 sesiones.',
    price: 380,
    duration: 90,
  },
  {
    name: 'Tratamiento de Conductos - Multirradicular (Molar)',
    category: 'ENDODONCIA',
    description: 'Tratamiento de conducto en molares con 3-4 conductos. Mayor complejidad anatómica. Requiere instrumental rotatorio de níquel-titanio e irrigación ultrasónica. 2-3 sesiones.',
    price: 480,
    duration: 120,
  },
  {
    name: 'Retratamiento de Conductos - Unirradicular',
    category: 'ENDODONCIA',
    description: 'Retreatment endodóntico en pieza unirradicular con tratamiento previo fracasado. Incluye desobturación, limpieza de conductos y nueva obturación.',
    price: 420,
    duration: 90,
  },
  {
    name: 'Retratamiento de Conductos - Molar',
    category: 'ENDODONCIA',
    description: 'Retreatment endodóntico en molar con tratamiento previo fracasado o incompleto. Procedimiento complejo que requiere microscopía clínica.',
    price: 580,
    duration: 120,
  },
  {
    name: 'Apicectomía (Cirugía Periapical)',
    category: 'ENDODONCIA',
    description: 'Cirugía de resección del ápice radicular con curetaje de la lesión periapical. Indicada en casos de fracaso endodóntico no resoluble convencionalmente. Incluye sutura y control.',
    price: 650,
    duration: 90,
  },
  {
    name: 'Medicación Intraconducto (entre sesiones)',
    category: 'ENDODONCIA',
    description: 'Colocación de hidróxido de calcio u otro medicamento intraconducto entre sesiones de endodoncia para control de infección. Incluye sellado provisional.',
    price: 80,
    duration: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EXODONCIA Y CIRUGÍA ORAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Extracción Dental Simple',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extracción de pieza dental erupcionada sin complicaciones con forceps y elevadores. Incluye anestesia local y control post-operatorio.',
    price: 80,
    duration: 30,
  },
  {
    name: 'Extracción Dental Compleja',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extracción de pieza con dificultad aumentada por raíces divergentes, dilaceradas, hipercementosis o escasa corona residual. Puede requerir odontosección.',
    price: 140,
    duration: 45,
  },
  {
    name: 'Extracción de 3era Molar Erupcionada',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extracción de muela del juicio completamente erupcionada o con erupción parcial simple. Incluye radiografía periapical de planificación y sutura.',
    price: 180,
    duration: 45,
  },
  {
    name: 'Cirugía de 3era Molar Retenida / Impactada',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extracción quirúrgica de tercer molar retenido (horizontal, mesioangulado o vertical profundo). Incluye colgajo mucoperióstico, osteotomía, odontosección, sutura y control post-operatorio.',
    price: 480,
    duration: 90,
  },
  {
    name: 'Extracción de Diente Deciduo (Niños)',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extracción de diente de leche. Técnica atraumática con fórceps pediátrico. Incluye manejo del comportamiento y anestesia tópica + infiltrativa.',
    price: 60,
    duration: 20,
  },
  {
    name: 'Alveoloplastia (Regularización Ósea)',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Regularización quirúrgica del reborde alveolar posterior a extracciones múltiples. Prepara el lecho para futura prótesis. Incluye sutura y control.',
    price: 350,
    duration: 60,
  },
  {
    name: 'Frenectomía Labial o Lingual',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Escisión o reposicionamiento del frenillo labial superior, inferior o lingual. Indicada en diastema interincisivo, anquiloglosia o problemas protésicos. Incluye sutura y control.',
    price: 300,
    duration: 45,
  },
  {
    name: 'Exéresis de Quiste o Mucocele',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Extirpación quirúrgica de quiste de retención mucosa (mucocele), épulis o lesión de tejidos blandos menor. Incluye estudio histopatológico básico y sutura.',
    price: 380,
    duration: 60,
  },
  {
    name: 'Biopsia de Tejidos Blandos',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Toma de muestra de tejido blando para estudio anatomopatológico. Indicada en lesiones de diagnóstico incierto. Precio no incluye análisis de laboratorio externo.',
    price: 200,
    duration: 30,
  },
  {
    name: 'Sutura de Herida Intraoral',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Sutura de laceración o herida intraoral traumática. Incluye anestesia local, limpieza y afrontamiento de bordes con material reabsorbible.',
    price: 120,
    duration: 30,
  },
  {
    name: 'Retiro de Puntos de Sutura',
    category: 'EXODONCIA Y CIRUGÍA',
    description: 'Remoción de puntos de sutura no reabsorbibles post-cirugía. Incluye evaluación de cicatrización.',
    price: 30,
    duration: 15,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PERIODONCIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Evaluación Periodontal (Periodontograma)',
    category: 'PERIODONCIA',
    description: 'Examen periodontal completo con sondaje de profundidad de bolsas, nivel de inserción clínica, movilidad dental, índice de placa y sangrado. Incluye periodontograma digital.',
    price: 80,
    duration: 45,
  },
  {
    name: 'Destartraje y Pulido Subgingival - por Cuadrante',
    category: 'PERIODONCIA',
    description: 'Remoción de cálculo sub y supragingival por cuadrante con ultrasonido e instrumental de mano. Para tratamiento de gingivitis y periodontitis leve a moderada.',
    price: 120,
    duration: 45,
  },
  {
    name: 'Curetaje Cerrado (Raspado y Alisado Radicular) - por Cuadrante',
    category: 'PERIODONCIA',
    description: 'Tratamiento periodontal no quirúrgico profundo por cuadrante bajo anestesia local. Eliminación de cálculo subgingival, raspado y alisado de la superficie radicular con curetas.',
    price: 150,
    duration: 60,
  },
  {
    name: 'Curetaje Abierto (Colgajo Periodontal) - por Sector',
    category: 'PERIODONCIA',
    description: 'Cirugía periodontal con elevación de colgajo mucoperióstico para acceso directo al hueso alveolar y raíces. Para periodontitis moderada a severa. Incluye sutura y controles.',
    price: 480,
    duration: 90,
  },
  {
    name: 'Gingivectomía / Gingivoplastia - por Sector',
    category: 'PERIODONCIA',
    description: 'Resección y remodelado del tejido gingival hiperplásico o para corrección de contorno gingival. Indicada en agrandamiento gingival, bolsas gingivales o para estética.',
    price: 350,
    duration: 60,
  },
  {
    name: 'Alargamiento de Corona Clínica (por pieza)',
    category: 'PERIODONCIA',
    description: 'Procedimiento quirúrgico para exponer más estructura dental mediante resección de encía y hueso alveolar. Indicado previo a restauraciones con margen subgingival o para estética.',
    price: 280,
    duration: 60,
  },
  {
    name: 'Injerto Gingival (por zona)',
    category: 'PERIODONCIA',
    description: 'Injerto de tejido conectivo subepitelial o gingival libre para cobertura de recesiones gingivales o aumento de encía queratinizada. Mayor complejidad quirúrgica.',
    price: 650,
    duration: 90,
  },
  {
    name: 'Control Periodontal (Mantenimiento)',
    category: 'PERIODONCIA',
    description: 'Visita de mantenimiento periodontal cada 3-4 meses. Incluye sondaje selectivo, destartraje supragingival y refuerzo de higiene oral.',
    price: 100,
    duration: 45,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PRÓTESIS DENTAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Prótesis Total Acrílica (Superior o Inferior)',
    category: 'PRÓTESIS DENTAL',
    description: 'Dentadura completa removible en acrílico para paciente edéntulo total. Incluye impresiones, prueba de dientes, inserción y ajustes. Fabricada en laboratorio dental de alta calidad.',
    price: 700,
    duration: 60,
  },
  {
    name: 'Prótesis Total Completa (Superior + Inferior)',
    category: 'PRÓTESIS DENTAL',
    description: 'Par de prótesis totales (bimaxilar) para paciente completamente edéntulo. Incluye estudio oclusal, dimensión vertical, relación céntrica y ajustes oclusales.',
    price: 1300,
    duration: 60,
  },
  {
    name: 'Prótesis Parcial Removible Acrílica',
    category: 'PRÓTESIS DENTAL',
    description: 'Prótesis removible con base de acrílico y ganchos de retención. Para rehabilitación de edentulismo parcial. Incluye impresiones, prueba y ajustes.',
    price: 550,
    duration: 60,
  },
  {
    name: 'Prótesis Parcial Removible Metálica (Esquelética)',
    category: 'PRÓTESIS DENTAL',
    description: 'Prótesis parcial removible con estructura de cromo-cobalto colada. Mayor resistencia, menor volumen y mejor retención que la acrílica. Incluye diseño, colado en laboratorio y ajustes.',
    price: 900,
    duration: 60,
  },
  {
    name: 'Corona Metal-Porcelana (por unidad)',
    category: 'PRÓTESIS DENTAL',
    description: 'Corona fija con núcleo metálico recubierto de porcelana. Combina resistencia y estética. Incluye preparación dentaria, impresión, provisional, cementación definitiva y ajuste oclusal.',
    price: 550,
    duration: 60,
  },
  {
    name: 'Corona de Zirconia (por unidad)',
    category: 'PRÓTESIS DENTAL',
    description: 'Corona libre de metal fabricada en óxido de zirconio de alta resistencia. Máxima estética y biocompatibilidad. Libre de metal. Indicada para sector anterior y posterior. CAD/CAM.',
    price: 950,
    duration: 60,
  },
  {
    name: 'Corona de Disilicato de Litio e.max (por unidad)',
    category: 'PRÓTESIS DENTAL',
    description: 'Corona vitrocerámica prensada de disilicato de litio. Alta resistencia a la flexión y traslucidez óptima para sector anterior. Para restauraciones adhesivas o cementadas.',
    price: 900,
    duration: 60,
  },
  {
    name: 'Puente Fijo 3 Unidades Metal-Porcelana',
    category: 'PRÓTESIS DENTAL',
    description: 'Puente fijo de 3 piezas (2 pilares + 1 póntico) en metal-porcelana para reemplazar un diente perdido. Incluye preparación de pilares, provisionales, impresión e instalación.',
    price: 1600,
    duration: 60,
  },
  {
    name: 'Puente Fijo 3 Unidades en Zirconia',
    category: 'PRÓTESIS DENTAL',
    description: 'Puente fijo de 3 unidades totalmente en zirconia de alta resistencia. Libre de metal. Máxima estética para sector anterior o posterior. Tecnología CAD/CAM.',
    price: 2700,
    duration: 60,
  },
  {
    name: 'Provisional Acrílico (por unidad)',
    category: 'PRÓTESIS DENTAL',
    description: 'Corona provisional de acrílico mientras se fabrica la restauración definitiva en laboratorio. Protege la preparación y mantiene la estética transitoria.',
    price: 80,
    duration: 30,
  },
  {
    name: 'Ajuste / Reparación de Prótesis Removible',
    category: 'PRÓTESIS DENTAL',
    description: 'Reajuste, rebase o reparación de prótesis removible rota, fracturada o que ha perdido retención. Precio varía según tipo de reparación.',
    price: 120,
    duration: 30,
  },
  {
    name: 'Rebase de Prótesis (por prótesis)',
    category: 'PRÓTESIS DENTAL',
    description: 'Renovación de la base acrílica de una prótesis para readaptarla al reborde alveolar reabsorbido. Mejora la retención y estabilidad de la prótesis.',
    price: 250,
    duration: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. IMPLANTOLOGÍA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Implante Dental (Cirugía de Colocación)',
    category: 'IMPLANTOLOGÍA',
    description: 'Colocación quirúrgica de implante de titanio de marca certificada (ej. Straumann, Nobel, Zimmer, Neodent). Incluye cirugía, sutura, cicatrización y controles. No incluye corona.',
    price: 2800,
    duration: 90,
  },
  {
    name: 'Corona sobre Implante - Zirconia',
    category: 'IMPLANTOLOGÍA',
    description: 'Restauración protésica sobre implante con corona de zirconia. Incluye pilar protésico de titanio, impresión de transfer, fabricación en laboratorio e instalación.',
    price: 1200,
    duration: 60,
  },
  {
    name: 'Corona sobre Implante - Metal-Porcelana',
    category: 'IMPLANTOLOGÍA',
    description: 'Restauración sobre implante con corona metal-porcelana. Incluye pilar estándar, impresión de transfer, fabricación en laboratorio e instalación.',
    price: 800,
    duration: 60,
  },
  {
    name: 'Injerto Óseo (Regeneración Ósea Guiada)',
    category: 'IMPLANTOLOGÍA',
    description: 'Procedimiento de aumento óseo con hueso particulado sintético, xenoinjerto bovino o autoinjerto, más membrana de colágeno. Para pacientes con déficit óseo previo a implantes.',
    price: 1400,
    duration: 90,
  },
  {
    name: 'Elevación de Seno Maxilar (Ventana Lateral)',
    category: 'IMPLANTOLOGÍA',
    description: 'Cirugía de levantamiento del piso del seno maxilar para creación de espacio óseo suficiente para implantes en maxilar posterior. Técnica de ventana lateral.',
    price: 2000,
    duration: 120,
  },
  {
    name: 'Destape de Implante (2da Fase Quirúrgica)',
    category: 'IMPLANTOLOGÍA',
    description: 'Exposición quirúrgica del implante oseointegrado para colocación del pilar de cicatrización. Procedimiento menor bajo anestesia local.',
    price: 280,
    duration: 30,
  },
  {
    name: 'Rehabilitación sobre Implantes (All-on-4 / por arcada)',
    category: 'IMPLANTOLOGÍA',
    description: 'Rehabilitación completa de arcada sobre 4-6 implantes con prótesis fija provisional inmediata. Incluye cirugía, prótesis provisional y definitiva en zirconia. Precio referencial.',
    price: 18000,
    duration: 180,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ORTODONCIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Evaluación Ortodóntica + Plan de Tratamiento',
    category: 'ORTODONCIA',
    description: 'Evaluación clínica completa para ortodoncia. Incluye fotografías extraorales e intraorales, modelos de estudio, análisis cefalométrico y plan de tratamiento personalizado.',
    price: 150,
    duration: 60,
  },
  {
    name: 'Ortodoncia Metálica (Tratamiento Completo)',
    category: 'ORTODONCIA',
    description: 'Tratamiento de ortodoncia completo con brackets metálicos de autoligado o convencionales. Precio por el tratamiento total (promedio 18-24 meses). Incluye brackets, arcos, controles mensuales y retención.',
    price: 3200,
    duration: 60,
  },
  {
    name: 'Ortodoncia Cerámica (Tratamiento Completo)',
    category: 'ORTODONCIA',
    description: 'Tratamiento con brackets cerámicos del color del diente para mayor discreción estética. Mismas mecánicas que metálica pero con mayor comodidad estética. Incluye controles y retención.',
    price: 4500,
    duration: 60,
  },
  {
    name: 'Ortodoncia de Autoligado (Damon o similar)',
    category: 'ORTODONCIA',
    description: 'Tratamiento con brackets de autoligado pasivo (sistema Damon, In-Ovation, etc.). Menor fricción, menor número de visitas y mayor comodidad. Incluye todo el tratamiento.',
    price: 4000,
    duration: 60,
  },
  {
    name: 'Alineadores Transparentes (Invisalign o similar)',
    category: 'ORTODONCIA',
    description: 'Tratamiento con alineadores termoformados transparentes y removibles. Estética máxima. Precio varía según complejidad del caso (leve, moderado, completo). Precio referencial moderado.',
    price: 5500,
    duration: 30,
  },
  {
    name: 'Control Mensual de Ortodoncia',
    category: 'ORTODONCIA',
    description: 'Visita de activación/ajuste mensual de aparatología ortodóntica. Cambio de arcos, ligaduras y evaluación del progreso del tratamiento.',
    price: 100,
    duration: 30,
  },
  {
    name: 'Retenedor Removible Hawley (por pieza)',
    category: 'ORTODONCIA',
    description: 'Retenedor removible de acrílico con arco vestibular para mantener la posición dental post-ortodoncia. Se recomienda uso nocturno indefinido.',
    price: 220,
    duration: 20,
  },
  {
    name: 'Retenedor Fijo (Alambre Lingual)',
    category: 'ORTODONCIA',
    description: 'Retenedor fijo de alambre trenzado de 3x3 adherido con composite en cara lingual de dientes anteriores. Retención permanente post-tratamiento de ortodoncia.',
    price: 180,
    duration: 30,
  },
  {
    name: 'Ortodoncia Interceptiva (Niños 7-12 años)',
    category: 'ORTODONCIA',
    description: 'Tratamiento de ortodoncia temprana en dentición mixta para corregir problemas esqueléticos y de espacio. Incluye aparatos removibles o fijos según el caso.',
    price: 1800,
    duration: 45,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ESTÉTICA DENTAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Blanqueamiento Dental en Consultorio (1 sesión)',
    category: 'ESTÉTICA DENTAL',
    description: 'Blanqueamiento profesional en sillón con gel de peróxido de hidrógeno de alta concentración y activación por luz LED/láser. Resultados inmediatos en una sesión de 60-90 min.',
    price: 380,
    duration: 90,
  },
  {
    name: 'Blanqueamiento Dental en Casa (Férulas personalizadas)',
    category: 'ESTÉTICA DENTAL',
    description: 'Blanqueamiento domiciliario con férulas termoformadas a medida y gel de peróxido de carbamida. Incluye 2 jeringas de gel. Aplicación nocturna durante 2-4 semanas.',
    price: 250,
    duration: 30,
  },
  {
    name: 'Blanqueamiento Combinado (Consultorio + Casa)',
    category: 'ESTÉTICA DENTAL',
    description: 'Protocolo combinado: 1 sesión de blanqueamiento en consultorio + kit domiciliario. Máxima efectividad y durabilidad del resultado estético.',
    price: 580,
    duration: 90,
  },
  {
    name: 'Carilla de Porcelana / Cerámica (por pieza)',
    category: 'ESTÉTICA DENTAL',
    description: 'Lámina ultradelgada de porcelana adherida a la superficie vestibular del diente. Corrige color, forma y alineamiento. Mínimamente invasiva. Incluye preparación, provisional e instalación.',
    price: 900,
    duration: 90,
  },
  {
    name: 'Carilla de Resina Directa (por pieza)',
    category: 'ESTÉTICA DENTAL',
    description: 'Carilla de composite de alta estética aplicada directamente sobre el diente sin laboratorio. Alternativa económica y reversible a las carillas de porcelana. Resultados estéticos inmediatos.',
    price: 200,
    duration: 60,
  },
  {
    name: 'Diseño de Sonrisa Digital (DSD)',
    category: 'ESTÉTICA DENTAL',
    description: 'Planificación estética mediante fotografías y software especializado para simular el resultado final del tratamiento. Permite al paciente visualizar su sonrisa ideal antes de iniciar.',
    price: 150,
    duration: 60,
  },
  {
    name: 'Mock-up Diagnóstico (Encerado)',
    category: 'ESTÉTICA DENTAL',
    description: 'Prueba estética en boca con composite para que el paciente evalúe forma y tamaño de los dientes antes del tratamiento definitivo. Se realiza sobre los dientes sin desgaste.',
    price: 180,
    duration: 45,
  },
  {
    name: 'Contorneado de Esmalte / Remodelado (por pieza)',
    category: 'ESTÉTICA DENTAL',
    description: 'Corrección de la forma y tamaño del diente mediante desgaste selectivo del esmalte con instrumentos rotativos. Para irregularidades leves sin necesidad de restauración.',
    price: 60,
    duration: 20,
  },
  {
    name: 'Corrección de Diastema con Resina',
    category: 'ESTÉTICA DENTAL',
    description: 'Cierre estético de espacio entre dientes (diastema) mediante adición de resina compuesta. Resultado inmediato. Incluye 1-2 piezas involucradas.',
    price: 220,
    duration: 60,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. ODONTOPEDIATRÍA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'Consulta Odontopediátrica (Primera Visita)',
    category: 'ODONTOPEDIATRÍA',
    description: 'Primera evaluación dental del niño. Incluye examen clínico completo, historia clínica, manejo del comportamiento, educación a padres y plan de tratamiento preventivo.',
    price: 50,
    duration: 40,
  },
  {
    name: 'Profilaxis Pediátrica + Fluorización',
    category: 'ODONTOPEDIATRÍA',
    description: 'Limpieza dental profesional con copa profiláctica adaptada para niños más aplicación de barniz de flúor. Refuerzo de hábitos de higiene oral. Recomendado cada 6 meses.',
    price: 90,
    duration: 30,
  },
  {
    name: 'Sellante por Pieza (Niños)',
    category: 'ODONTOPEDIATRÍA',
    description: 'Colocación de sellante de resina en fosas y fisuras de molares permanentes recién erupcionados (6-12 años). Máxima prevención de caries. Por pieza dental.',
    price: 50,
    duration: 20,
  },
  {
    name: 'Restauración de Resina en Diente Deciduo',
    category: 'ODONTOPEDIATRÍA',
    description: 'Obturación con resina compuesta o ionómero de vidrio en diente de leche. Técnica adaptada para manejo pediátrico con aislamiento relativo o absoluto.',
    price: 70,
    duration: 40,
  },
  {
    name: 'Pulpotomía en Diente Deciduo',
    category: 'ODONTOPEDIATRÍA',
    description: 'Tratamiento parcial de la pulpa en diente de leche con lesión pulpar reversible. Extirpación de la pulpa coronaria y medicación con formocresol o MTA. Incluye restauración provisional.',
    price: 130,
    duration: 45,
  },
  {
    name: 'Pulpectomía en Diente Deciduo',
    category: 'ODONTOPEDIATRÍA',
    description: 'Tratamiento de conductos en diente deciduo con obturación reabsorbible (pasta ZOE o iodoformo). Para caries profunda con compromiso pulpar total. Incluye restauración.',
    price: 180,
    duration: 60,
  },
  {
    name: 'Corona de Acero Inoxidable Pediátrica (por pieza)',
    category: 'ODONTOPEDIATRÍA',
    description: 'Corona metálica prefabricada para restauración de molares deciduos con gran destrucción coronaria. Durable hasta la exfoliación natural del diente de leche.',
    price: 250,
    duration: 45,
  },
  {
    name: 'Mantenedor de Espacio Fijo (Band & Loop)',
    category: 'ODONTOPEDIATRÍA',
    description: 'Aparato fijo para mantener el espacio posterior a la pérdida prematura de un diente de leche. Previene el colapso del espacio y problemas de erupción del permanente.',
    price: 350,
    duration: 30,
  },
  {
    name: 'Control de Hábitos (Aparato Antichupete / Antidedo)',
    category: 'ODONTOPEDIATRÍA',
    description: 'Aparato intraoral fijo o removible para eliminación de hábitos de succión no nutritiva (chupete, dedo). Para niños mayores de 3 años con persistencia del hábito.',
    price: 450,
    duration: 45,
  },

];

// ─── Función principal ────────────────────────────────────────────────────────
async function seedServices() {
  console.log('\n🦷  Iniciando seed de Servicios Dentales...\n');

  // Obtener todas las empresas activas
  const companies = await prisma.company.findMany({ where: { active: true } });

  if (companies.length === 0) {
    console.warn('⚠️  No se encontraron empresas activas. Ejecuta el seed principal primero.');
    return;
  }

  let totalCreados = 0;
  let totalOmitidos = 0;

  for (const company of companies) {
    console.log(`\n  Empresa: "${company.name}" (ID: ${company.id})`);

    // Obtener servicios existentes de esta empresa (por nombre)
    const existingServices = await prisma.service.findMany({
      where: { companyId: company.id },
      select: { name: true, category: true },
    });

    const existingSet = new Set(
      existingServices.map((s) => `${s.category}::${s.name}`)
    );

    const toCreate = DENTAL_SERVICES.filter(
      (s) => !existingSet.has(`${s.category}::${s.name}`)
    );

    const omitidos = DENTAL_SERVICES.length - toCreate.length;
    totalOmitidos += omitidos;

    if (toCreate.length === 0) {
      console.log(`  ✅ Todos los ${DENTAL_SERVICES.length} servicios ya existen. Sin cambios.`);
      continue;
    }

    // Crear los servicios nuevos en lote
    const result = await prisma.service.createMany({
      data: toCreate.map((s) => ({
        ...s,
        active: true,
        companyId: company.id,
      })),
    });

    totalCreados += result.count;

    if (omitidos > 0) {
      console.log(`  ⏭️  ${omitidos} servicio(s) ya existían — omitidos.`);
    }
    console.log(`  ✅ ${result.count} servicios creados.`);
  }

  // ─── Resumen por categoría ───────────────────────────────────────────────
  const categorias = [...new Set(DENTAL_SERVICES.map((s) => s.category))];
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('  CATÁLOGO DE SERVICIOS DENTALES — RESUMEN');
  console.log('─────────────────────────────────────────────────────────────');
  for (const cat of categorias) {
    const count = DENTAL_SERVICES.filter((s) => s.category === cat).length;
    console.log(`  ${cat.padEnd(30)} ${count} servicio(s)`);
  }
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  TOTAL en catálogo : ${DENTAL_SERVICES.length} servicios`);
  console.log(`  Creados           : ${totalCreados}`);
  console.log(`  Omitidos (ya exist): ${totalOmitidos}`);
  console.log(`  Empresas procesadas: ${companies.length}`);
  console.log('─────────────────────────────────────────────────────────────\n');
}

// ─── Ejecución ────────────────────────────────────────────────────────────────
seedServices()
  .catch((e) => {
    console.error('❌ Error durante el seed de servicios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });