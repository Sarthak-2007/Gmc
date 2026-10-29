import { Chapter, ClusterInfo, SpacedRepetitionSettings, StudyLog, Subject, SyllabusPacingSettings, Test, TestScore } from '../types';

export const NEET_CLUSTERS: ClusterInfo[] = [
  { id: 1, name: 'Mechanics I (Kinematics & Laws of Motion)', subject: 'Physics', description: 'Basic Math, Vectors, Units, 1D/2D Motion, Newton\'s Laws, Friction, Experimental Skills' },
  { id: 2, name: 'Mechanics II (Energy, Rotation & Gravity)', subject: 'Physics', description: 'Work-Energy-Power, Centre of Mass, Rotational Dynamics, Gravitation' },
  { id: 3, name: 'Matter & Thermodynamics', subject: 'Physics', description: 'Solids, Fluids, Thermal Properties, Kinetic Theory & Thermodynamics' },
  { id: 4, name: 'Oscillations & Waves', subject: 'Physics', description: 'SHM, Simple Pendulum, Wave Motion, Acoustics & Doppler Effect' },
  { id: 5, name: 'Electrodynamics I (Electrostatics & Current)', subject: 'Physics', description: 'Charges, Fields, Capacitors, Current Electricity, Metre Bridge' },
  { id: 6, name: 'Electrodynamics II & Magnetism', subject: 'Physics', description: 'Magnetic Effects, Magnetism & Matter, EMI, Alternating Current, EM Waves' },
  { id: 7, name: 'Optics & Modern Physics', subject: 'Physics', description: 'Ray Optics, Wave Optics, Dual Nature, Atoms, Nuclei, Semiconductors' },
  { id: 8, name: 'Physical Chemistry I (Atomic & Bonding)', subject: 'Chemistry', description: 'Mole Concept, Atomic Structure, Periodic Table, Chemical Bonding' },
  { id: 9, name: 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', subject: 'Chemistry', description: 'Thermodynamics, Equilibrium, Redox, Solutions, Electrochemistry, Kinetics' },
  { id: 10, name: 'Inorganic Chemistry & Coordination', subject: 'Chemistry', description: 'p-Block, d & f-Block, Coordination Compounds, Practical Salt Analysis' },
  { id: 11, name: 'Organic Chemistry I (Basics & Hydrocarbons)', subject: 'Chemistry', description: 'Nomenclature, Isomerism, GOC, Purification, Hydrocarbons, Haloalkanes' },
  { id: 12, name: 'Organic Chemistry II (Functional Groups & Biomolecules)', subject: 'Chemistry', description: 'Alcohols, Aldehydes, Ketones, Carboxylic Acids, Amines, Biomolecules' },
  { id: 13, name: 'Living World & Plant Morphology', subject: 'Botany', description: 'Living World, Biological Classification, Plant Kingdom, Morphology & Anatomy' },
  { id: 14, name: 'Cell Biology & Plant Physiology', subject: 'Botany', description: 'Cell Unit, Cell Cycle, Photosynthesis, Plant Respiration, Plant Growth' },
  { id: 15, name: 'Genetics, Biotechnology & Ecology', subject: 'Botany', description: 'Sexual Reproduction, Inheritance, Molecular Genetics, Biotech, Ecosystem, Biodiversity' },
  { id: 16, name: 'Animal Diversity, Human Physiology & Zoology', subject: 'Zoology', description: 'Animal Kingdom, Animal Tissues & Morphology, Human Organ Systems, Reproduction, Evolution, Health & Disease' }
];

export const DEFAULT_SETTINGS: SpacedRepetitionSettings = {
  defaultGaps: [3, 7, 14, 30],
  confidenceMultipliers: {
    1: 0.5,
    2: 0.5,
    3: 1.0,
    4: 1.5,
    5: 1.5
  }
};

export const DEFAULT_PACING_SETTINGS: SyllabusPacingSettings = {
  targetSyllabusDate: '2026-12-31',
  targetExamDate: '2027-05-02',
  targetRevisionPasses: 3,
  targetMockTestsCount: 25,
  includeAllTestsGoal: true,
  studyDaysPerWeek: 7,
};

const createRawChapter = (
  id: string,
  name: string,
  subject: Subject,
  clusterId: number,
  clusterName: string,
  classLevel?: '11' | '12'
): Chapter => ({
  id,
  name,
  subject,
  clusterId,
  clusterName,
  classLevel,
  currentConfidence: 0,
  learningStage: 'NOT_STARTED',
  completionPercentage: 0,
  lastStudiedDate: null,
  nextRevisionDate: null,
  revisionCount: 0,
  startedDate: null,
  daysTakenToComplete: null,
  totalStudySessions: 0,
  pillars: {
    lectures: false,
    bookReading: false,
    ncertReading: false,
    classNotes: false,
    questionPractice: false,
    anki: false,
  },
  isArchived: false,
  createdAt: '2026-06-01',
});

export const INITIAL_CHAPTERS: Chapter[] = [
  // ================= PHYSICS (31 CHAPTERS) =================
  createRawChapter('ch-phy-01', 'Basic Mathematics Used In Physics & Vectors', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-02', 'Unit, Dimensions and Measurement', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-03', 'Experimental Skills (Vernier Calipers, Screw Gauge, Metre Scale)', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-04', 'Motion in a Straight Line (Kinematics 1D)', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-05', 'Motion in a Plane & Circular Motion', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-06', 'Laws of Motion and Friction', 'Physics', 1, 'Mechanics I (Kinematics & Laws of Motion)', '11'),
  createRawChapter('ch-phy-07', 'Work, Energy and Power', 'Physics', 2, 'Mechanics II (Energy, Rotation & Gravity)', '11'),
  createRawChapter('ch-phy-08', 'Collisions & Centre of Mass (System of Particles)', 'Physics', 2, 'Mechanics II (Energy, Rotation & Gravity)', '11'),
  createRawChapter('ch-phy-09', 'Rotational Motion & Moment of Inertia', 'Physics', 2, 'Mechanics II (Energy, Rotation & Gravity)', '11'),
  createRawChapter('ch-phy-10', 'Gravitation', 'Physics', 2, 'Mechanics II (Energy, Rotation & Gravity)', '11'),
  createRawChapter('ch-phy-11', 'Mechanical Properties of Solids (Elasticity, Young\'s Modulus)', 'Physics', 3, 'Matter & Thermodynamics', '11'),
  createRawChapter('ch-phy-12', 'Mechanical Properties of Fluids (Viscosity, Surface Tension)', 'Physics', 3, 'Matter & Thermodynamics', '11'),
  createRawChapter('ch-phy-13', 'Thermal Properties of Matter & Calorimetry', 'Physics', 3, 'Matter & Thermodynamics', '11'),
  createRawChapter('ch-phy-14', 'Thermodynamics & Kinetic Theory of Gases', 'Physics', 3, 'Matter & Thermodynamics', '11'),
  createRawChapter('ch-phy-15', 'Oscillations (Simple Harmonic Motion)', 'Physics', 4, 'Oscillations & Waves', '11'),
  createRawChapter('ch-phy-16', 'Wave Motion & Speed of Sound', 'Physics', 4, 'Oscillations & Waves', '11'),
  createRawChapter('ch-phy-17', 'Electrostatics (Electric Charges and Field)', 'Physics', 5, 'Electrodynamics I (Electrostatics & Current)', '12'),
  createRawChapter('ch-phy-18', 'Electrostatic Potential and Capacitance', 'Physics', 5, 'Electrodynamics I (Electrostatics & Current)', '12'),
  createRawChapter('ch-phy-19', 'Current Electricity & Circuit Analysis', 'Physics', 5, 'Electrodynamics I (Electrostatics & Current)', '12'),
  createRawChapter('ch-phy-20', 'Moving Charges and Magnetism (Magnetic Effect of Current)', 'Physics', 6, 'Electrodynamics II & Magnetism', '12'),
  createRawChapter('ch-phy-21', 'Magnetism and Matter', 'Physics', 6, 'Electrodynamics II & Magnetism', '12'),
  createRawChapter('ch-phy-22', 'Electromagnetic Induction (EMI)', 'Physics', 6, 'Electrodynamics II & Magnetism', '12'),
  createRawChapter('ch-phy-23', 'Alternating Current (AC)', 'Physics', 6, 'Electrodynamics II & Magnetism', '12'),
  createRawChapter('ch-phy-24', 'Electromagnetic Waves (EM Waves)', 'Physics', 6, 'Electrodynamics II & Magnetism', '12'),
  createRawChapter('ch-phy-25', 'Ray Optics and Optical Instruments', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-26', 'Wave Optics & Interference/Diffraction', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-27', 'Dual Nature of Radiation and Matter (Modern Physics I)', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-28', 'Atoms (Modern Physics III)', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-29', 'Nuclei & Radioactivity (Modern Physics II)', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-30', 'Semiconductor & Electronics (Diodes, Zener, Logic Gates)', 'Physics', 7, 'Optics & Modern Physics', '12'),
  createRawChapter('ch-phy-31', 'Practical Physics (Resistivity, Metre Bridge, Galvanometer & Ohm\'s Law)', 'Physics', 5, 'Electrodynamics I (Electrostatics & Current)', '12'),

  // ================= CHEMISTRY (22 CHAPTERS) =================
  createRawChapter('ch-chm-01', 'Some Basic Concepts of Chemistry (Mole Concept)', 'Chemistry', 8, 'Physical Chemistry I (Atomic & Bonding)', '11'),
  createRawChapter('ch-chm-02', 'Structure of Atom (Atomic Structure)', 'Chemistry', 8, 'Physical Chemistry I (Atomic & Bonding)', '11'),
  createRawChapter('ch-chm-03', 'Classification of Elements & Periodicity in Properties (Periodic Table)', 'Chemistry', 8, 'Physical Chemistry I (Atomic & Bonding)', '11'),
  createRawChapter('ch-chm-04', 'Chemical Bonding and Molecular Structure', 'Chemistry', 8, 'Physical Chemistry I (Atomic & Bonding)', '11'),
  createRawChapter('ch-chm-05', 'Chemical Thermodynamics & Enthalpy', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '11'),
  createRawChapter('ch-chm-06', 'Chemical & Ionic Equilibrium', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '11'),
  createRawChapter('ch-chm-07', 'Redox Reactions', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '11'),
  createRawChapter('ch-chm-08', 'Solutions and Colligative Properties', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '12'),
  createRawChapter('ch-chm-09', 'Electrochemistry', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '12'),
  createRawChapter('ch-chm-10', 'Chemical Kinetics', 'Chemistry', 9, 'Physical Chemistry II (Energetics, Equilibrium & Kinetics)', '12'),
  createRawChapter('ch-chm-11', 'p-Block Elements (Group 13 to 18)', 'Chemistry', 10, 'Inorganic Chemistry & Coordination', '12'),
  createRawChapter('ch-chm-12', 'The d- and f-Block Elements', 'Chemistry', 10, 'Inorganic Chemistry & Coordination', '12'),
  createRawChapter('ch-chm-13', 'Coordination Compounds', 'Chemistry', 10, 'Inorganic Chemistry & Coordination', '12'),
  createRawChapter('ch-chm-14', 'Organic Chemistry - Some Basic Principles and Techniques (Nomenclature, Isomerism, GOC)', 'Chemistry', 11, 'Organic Chemistry I (Basics & Hydrocarbons)', '11'),
  createRawChapter('ch-chm-15', 'Purification and Characterisation of Organic Compounds', 'Chemistry', 11, 'Organic Chemistry I (Basics & Hydrocarbons)', '11'),
  createRawChapter('ch-chm-16', 'Hydrocarbons (Alkanes, Alkenes, Alkynes & Aromatic)', 'Chemistry', 11, 'Organic Chemistry I (Basics & Hydrocarbons)', '11'),
  createRawChapter('ch-chm-17', 'Haloalkanes and Haloarenes (Organic Halogens)', 'Chemistry', 11, 'Organic Chemistry I (Basics & Hydrocarbons)', '12'),
  createRawChapter('ch-chm-18', 'Alcohols, Phenols and Ethers', 'Chemistry', 12, 'Organic Chemistry II (Functional Groups & Biomolecules)', '12'),
  createRawChapter('ch-chm-19', 'Aldehydes, Ketones and Carboxylic Acids', 'Chemistry', 12, 'Organic Chemistry II (Functional Groups & Biomolecules)', '12'),
  createRawChapter('ch-chm-20', 'Amines & Diazonium Salts (Organic Nitrogen Compounds)', 'Chemistry', 12, 'Organic Chemistry II (Functional Groups & Biomolecules)', '12'),
  createRawChapter('ch-chm-21', 'Biomolecules (Carbohydrates, Proteins, Nucleic Acids, Vitamins)', 'Chemistry', 12, 'Organic Chemistry II (Functional Groups & Biomolecules)', '12'),
  createRawChapter('ch-chm-22', 'Principles Related to Practical Chemistry (Salt Analysis, Titration & Sols)', 'Chemistry', 10, 'Inorganic Chemistry & Coordination', '12'),

  // ================= BOTANY (18 CHAPTERS) =================
  createRawChapter('ch-bot-01', 'The Living World', 'Botany', 13, 'Living World & Plant Morphology', '11'),
  createRawChapter('ch-bot-02', 'Biological Classification', 'Botany', 13, 'Living World & Plant Morphology', '11'),
  createRawChapter('ch-bot-03', 'Plant Kingdom (Algae, Bryo, Pterido, Gymno, Angio)', 'Botany', 13, 'Living World & Plant Morphology', '11'),
  createRawChapter('ch-bot-04', 'Morphology of Flowering Plants', 'Botany', 13, 'Living World & Plant Morphology', '11'),
  createRawChapter('ch-bot-05', 'Anatomy of Flowering Plants', 'Botany', 13, 'Living World & Plant Morphology', '11'),
  createRawChapter('ch-bot-06', 'Cell: The Unit of Life', 'Botany', 14, 'Cell Biology & Plant Physiology', '11'),
  createRawChapter('ch-bot-07', 'Cell Cycle and Cell Division', 'Botany', 14, 'Cell Biology & Plant Physiology', '11'),
  createRawChapter('ch-bot-08', 'Photosynthesis in Higher Plants', 'Botany', 14, 'Cell Biology & Plant Physiology', '11'),
  createRawChapter('ch-bot-09', 'Respiration in Plants', 'Botany', 14, 'Cell Biology & Plant Physiology', '11'),
  createRawChapter('ch-bot-10', 'Plant Growth and Development (Growth Regulators)', 'Botany', 14, 'Cell Biology & Plant Physiology', '11'),
  createRawChapter('ch-bot-11', 'Sexual Reproduction in Flowering Plants', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-12', 'Principles of Inheritance and Variation (Genetics I)', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-13', 'Molecular Basis of Inheritance (Genetics II - DNA/RNA)', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-14', 'Biotechnology: Principles and Processes', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-15', 'Biotechnology and its Applications', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-16', 'Organisms and Populations (Ecology I)', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-17', 'Ecosystem (Ecology II)', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),
  createRawChapter('ch-bot-18', 'Biodiversity and its Conservation (Ecology III)', 'Botany', 15, 'Genetics, Biotechnology & Ecology', '12'),

  // ================= ZOOLOGY (15 CHAPTERS) =================
  createRawChapter('ch-zoo-01', 'Animal Kingdom (Non-chordates & Chordates)', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-02', 'Structural Organisation in Animals - Animal Tissues', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-03', 'Structural Organisation in Animals - Animal Morphology (Frog & Cockroach)', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-04', 'Biomolecules with Enzymes', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-05', 'Breathing and Exchange of Gases', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-06', 'Body Fluids and Circulation', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-07', 'Excretory Products and their Elimination', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-08', 'Locomotion and Movement', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-09', 'Neural Control and Coordination', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-10', 'Chemical Coordination and Integration (Endocrine System)', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '11'),
  createRawChapter('ch-zoo-11', 'Human Reproduction', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '12'),
  createRawChapter('ch-zoo-12', 'Reproductive Health', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '12'),
  createRawChapter('ch-zoo-13', 'Evolution (Origin of Life, Theories & Human Evolution)', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '12'),
  createRawChapter('ch-zoo-14', 'Human Health and Disease', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '12'),
  createRawChapter('ch-zoo-15', 'Microbes in Human Welfare', 'Zoology', 16, 'Animal Diversity, Human Physiology & Zoology', '12'),
];

// Complete 11th and 12th class chapter arrays for full tests
const ALL_11TH_IDS: string[] = [
  'ch-phy-01', 'ch-phy-02', 'ch-phy-03', 'ch-phy-04', 'ch-phy-05', 'ch-phy-06', 'ch-phy-07', 'ch-phy-08', 'ch-phy-09', 'ch-phy-10', 'ch-phy-11', 'ch-phy-12', 'ch-phy-13', 'ch-phy-14', 'ch-phy-15', 'ch-phy-16',
  'ch-chm-01', 'ch-chm-02', 'ch-chm-03', 'ch-chm-04', 'ch-chm-05', 'ch-chm-06', 'ch-chm-07', 'ch-chm-14', 'ch-chm-15', 'ch-chm-16',
  'ch-bot-01', 'ch-bot-02', 'ch-bot-03', 'ch-bot-04', 'ch-bot-05', 'ch-bot-06', 'ch-bot-07', 'ch-bot-08', 'ch-bot-09', 'ch-bot-10',
  'ch-zoo-01', 'ch-zoo-02', 'ch-zoo-03', 'ch-zoo-04', 'ch-zoo-05', 'ch-zoo-06', 'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09', 'ch-zoo-10'
];

const ALL_12TH_IDS: string[] = [
  'ch-phy-17', 'ch-phy-18', 'ch-phy-19', 'ch-phy-20', 'ch-phy-21', 'ch-phy-22', 'ch-phy-23', 'ch-phy-24', 'ch-phy-25', 'ch-phy-26', 'ch-phy-27', 'ch-phy-28', 'ch-phy-29', 'ch-phy-30', 'ch-phy-31',
  'ch-chm-08', 'ch-chm-09', 'ch-chm-10', 'ch-chm-11', 'ch-chm-12', 'ch-chm-13', 'ch-chm-17', 'ch-chm-18', 'ch-chm-19', 'ch-chm-20', 'ch-chm-21', 'ch-chm-22',
  'ch-bot-11', 'ch-bot-12', 'ch-bot-13', 'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18',
  'ch-zoo-11', 'ch-zoo-12', 'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
];

const FULL_SYLLABUS_IDS: string[] = [...ALL_11TH_IDS, ...ALL_12TH_IDS];

export const INITIAL_TESTS: Test[] = [
  // ================= JUNE 2026 =================
  {
    id: 'test-2026-06-28-allen-minor-1',
    name: 'ALLEN - MINOR TEST-1',
    coachingName: 'Allen',
    date: '2026-06-28',
    subjectOrScope: 'Basic Math & Vectors, Units & Measurement, Electrostatics, Exp Skills | Mole Concept, Atomic Structure | Living World, Biological Class., Plant & Animal Kingdom',
    linkedChapterIds: [
      'ch-phy-01', 'ch-phy-02', 'ch-phy-17', 'ch-phy-03',
      'ch-chm-01', 'ch-chm-02',
      'ch-bot-01', 'ch-bot-02', 'ch-bot-03',
      'ch-zoo-01'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= JULY 2026 =================
  {
    id: 'test-2026-07-19-allen-minor-2',
    name: 'ALLEN - MINOR TEST-2',
    coachingName: 'Allen',
    date: '2026-07-19',
    subjectOrScope: 'Kinematics 1D/2D, Current Electricity, Metre Bridge | Chemical Kinetics, Equilibrium | Flowering Plants Repro, Human Repro, Repro Health',
    linkedChapterIds: [
      'ch-phy-04', 'ch-phy-05', 'ch-phy-19', 'ch-phy-31',
      'ch-chm-10', 'ch-chm-06',
      'ch-bot-11',
      'ch-zoo-11', 'ch-zoo-12'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= AUGUST 2026 =================
  {
    id: 'test-2026-08-02-allen-minor-3',
    name: 'ALLEN - MINOR TEST-3',
    coachingName: 'Allen',
    date: '2026-08-02',
    subjectOrScope: 'Laws of Motion & Friction, Capacitor | Periodic Table, Chemical Bonding | Anatomy & Morphology of Plants, Animal Tissues, Frog, Cockroach',
    linkedChapterIds: [
      'ch-phy-06', 'ch-phy-18',
      'ch-chm-03', 'ch-chm-04',
      'ch-bot-04', 'ch-bot-05',
      'ch-zoo-02', 'ch-zoo-03'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-02-aakash-ut-1',
    name: 'AAKASH - UT-1',
    coachingName: 'Aakash',
    date: '2026-08-02',
    subjectOrScope: 'Units & Measurements, Straight Line Motion | Atomic Structure, Mole Concept | Cell Unit, Cell Cycle, Animal Tissues, Biomolecules',
    linkedChapterIds: [
      'ch-phy-02', 'ch-phy-04',
      'ch-chm-01', 'ch-chm-02',
      'ch-bot-06', 'ch-bot-07',
      'ch-zoo-02', 'ch-zoo-04', 'ch-chm-21'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-12-aakash-ut-2',
    name: 'AAKASH - UT-2',
    coachingName: 'Aakash',
    date: '2026-08-12',
    subjectOrScope: 'Motion in a Plane, Laws of Motion | Periodic Table, Chemical Bonding | Biological Class., Living World, Breathing, Circulation',
    linkedChapterIds: [
      'ch-phy-05', 'ch-phy-06',
      'ch-chm-03', 'ch-chm-04',
      'ch-bot-01', 'ch-bot-02',
      'ch-zoo-05', 'ch-zoo-06'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-16-allen-review-1',
    name: 'ALLEN - REVIEW TEST-1',
    coachingName: 'Allen',
    date: '2026-08-16',
    subjectOrScope: 'Cumulative Review: Allen Minor Tests 1, 2 & 3 Topics',
    linkedChapterIds: [
      'ch-phy-01', 'ch-phy-02', 'ch-phy-03', 'ch-phy-04', 'ch-phy-05', 'ch-phy-06', 'ch-phy-17', 'ch-phy-18', 'ch-phy-19', 'ch-phy-31',
      'ch-chm-01', 'ch-chm-02', 'ch-chm-03', 'ch-chm-04', 'ch-chm-06', 'ch-chm-10',
      'ch-bot-01', 'ch-bot-02', 'ch-bot-03', 'ch-bot-04', 'ch-bot-05', 'ch-bot-11',
      'ch-zoo-01', 'ch-zoo-02', 'ch-zoo-03', 'ch-zoo-11', 'ch-zoo-12'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-23-aakash-ut-3',
    name: 'AAKASH - UT-3',
    coachingName: 'Aakash',
    date: '2026-08-23',
    subjectOrScope: 'Work Power Energy, Rotational Motion | Thermodynamics | Plant Morphology, Anatomy, Excretory Products, Locomotion',
    linkedChapterIds: [
      'ch-phy-07', 'ch-phy-08', 'ch-phy-09',
      'ch-chm-05',
      'ch-bot-04', 'ch-bot-05',
      'ch-zoo-07', 'ch-zoo-08'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-30-allen-minor-4',
    name: 'ALLEN - MINOR TEST-4',
    coachingName: 'Allen',
    date: '2026-08-30',
    subjectOrScope: 'Work Energy Power, Circular Motion, Magnetism | Solutions, Electrochemistry, Practical Chem | Principles of Inheritance & Molecular Basis',
    linkedChapterIds: [
      'ch-phy-07', 'ch-phy-05', 'ch-phy-20', 'ch-phy-21', 'ch-phy-31',
      'ch-chm-08', 'ch-chm-09', 'ch-chm-22',
      'ch-bot-12', 'ch-bot-13'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-08-30-aakash-pt-1',
    name: 'AAKASH - PT-1 (Part Test)',
    coachingName: 'Aakash',
    date: '2026-08-30',
    subjectOrScope: 'Part Test: Cumulative topics covered in Aakash UT-1 to UT-3',
    linkedChapterIds: [
      'ch-phy-02', 'ch-phy-04', 'ch-phy-05', 'ch-phy-06', 'ch-phy-07', 'ch-phy-08', 'ch-phy-09',
      'ch-chm-01', 'ch-chm-02', 'ch-chm-03', 'ch-chm-04', 'ch-chm-05',
      'ch-bot-01', 'ch-bot-02', 'ch-bot-04', 'ch-bot-05', 'ch-bot-06', 'ch-bot-07',
      'ch-zoo-02', 'ch-zoo-04', 'ch-zoo-05', 'ch-zoo-06', 'ch-zoo-07', 'ch-zoo-08'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= SEPTEMBER 2026 =================
  {
    id: 'test-2026-09-09-aakash-ut-4',
    name: 'AAKASH - UT-4',
    coachingName: 'Aakash',
    date: '2026-09-09',
    subjectOrScope: 'Gravitation, Solids, Fluids | Equilibrium, Redox, Electrochemistry | Plant Kingdom, Photosynthesis, Neural & Chemical Coordination',
    linkedChapterIds: [
      'ch-phy-10', 'ch-phy-11', 'ch-phy-12',
      'ch-chm-06', 'ch-chm-07', 'ch-chm-09',
      'ch-bot-03', 'ch-bot-08',
      'ch-zoo-09', 'ch-zoo-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-09-13-allen-minor-5',
    name: 'ALLEN - MINOR TEST-5',
    coachingName: 'Allen',
    date: '2026-09-13',
    subjectOrScope: 'Collisions & Centre of Mass, EMI | Thermodynamics, Redox | Cell Unit, Biomolecules, Cell Cycle, Breathing, Circulation',
    linkedChapterIds: [
      'ch-phy-08', 'ch-phy-22',
      'ch-chm-05', 'ch-chm-07',
      'ch-bot-06', 'ch-bot-07',
      'ch-zoo-04', 'ch-zoo-05', 'ch-zoo-06'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-09-20-aakash-ut-5',
    name: 'AAKASH - UT-5',
    coachingName: 'Aakash',
    date: '2026-09-20',
    subjectOrScope: 'Thermal Properties, Thermodynamics, Kinetic Theory | Solutions, Kinetics | Plant Respiration, Plant Growth, Animal Kingdom',
    linkedChapterIds: [
      'ch-phy-13', 'ch-phy-14',
      'ch-chm-08', 'ch-chm-10',
      'ch-bot-09', 'ch-bot-10',
      'ch-zoo-01'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-09-27-allen-semi-major-1',
    name: 'ALLEN - SEMI MAJOR TEST-1',
    coachingName: 'Allen',
    date: '2026-09-27',
    subjectOrScope: 'Semi Major Test: Comprehensive evaluation of Allen Minor Tests 1 to 5',
    linkedChapterIds: [
      'ch-phy-01', 'ch-phy-02', 'ch-phy-03', 'ch-phy-04', 'ch-phy-05', 'ch-phy-06', 'ch-phy-07', 'ch-phy-08', 'ch-phy-17', 'ch-phy-18', 'ch-phy-19', 'ch-phy-20', 'ch-phy-21', 'ch-phy-22', 'ch-phy-31',
      'ch-chm-01', 'ch-chm-02', 'ch-chm-03', 'ch-chm-04', 'ch-chm-05', 'ch-chm-06', 'ch-chm-07', 'ch-chm-08', 'ch-chm-09', 'ch-chm-10', 'ch-chm-22',
      'ch-bot-01', 'ch-bot-02', 'ch-bot-03', 'ch-bot-04', 'ch-bot-05', 'ch-bot-06', 'ch-bot-07', 'ch-bot-11', 'ch-bot-12', 'ch-bot-13',
      'ch-zoo-01', 'ch-zoo-02', 'ch-zoo-03', 'ch-zoo-04', 'ch-zoo-05', 'ch-zoo-06', 'ch-zoo-11', 'ch-zoo-12'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-09-30-aakash-ut-6',
    name: 'AAKASH - UT-6',
    coachingName: 'Aakash',
    date: '2026-09-30',
    subjectOrScope: 'Oscillations, Waves | GOC, Hydrocarbons, Haloalkanes & Haloarenes | Sexual Repro in Plants, Genetics I, Animal Morphology',
    linkedChapterIds: [
      'ch-phy-15', 'ch-phy-16',
      'ch-chm-14', 'ch-chm-16', 'ch-chm-17',
      'ch-bot-11', 'ch-bot-12',
      'ch-zoo-03'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= OCTOBER 2026 =================
  {
    id: 'test-2026-10-04-allen-minor-6',
    name: 'ALLEN - MINOR TEST-6',
    coachingName: 'Allen',
    date: '2026-10-04',
    subjectOrScope: 'Rotational Motion, AC, EM Waves, Metre Scale | p-Block, d & f-Block, Coordination, Salt Analysis | Biotechnology I & II, Ecology & Ecosystem',
    linkedChapterIds: [
      'ch-phy-09', 'ch-phy-23', 'ch-phy-24', 'ch-phy-03',
      'ch-chm-11', 'ch-chm-12', 'ch-chm-13', 'ch-chm-22',
      'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-10-07-aakash-pt-2',
    name: 'AAKASH - PT-2 (Part Test)',
    coachingName: 'Aakash',
    date: '2026-10-07',
    subjectOrScope: 'Part Test: Cumulative topics covered from Aakash UT-4 to UT-6',
    linkedChapterIds: [
      'ch-phy-10', 'ch-phy-11', 'ch-phy-12', 'ch-phy-13', 'ch-phy-14', 'ch-phy-15', 'ch-phy-16',
      'ch-chm-06', 'ch-chm-07', 'ch-chm-08', 'ch-chm-09', 'ch-chm-10', 'ch-chm-14', 'ch-chm-16', 'ch-chm-17',
      'ch-bot-03', 'ch-bot-08', 'ch-bot-09', 'ch-bot-10', 'ch-bot-11', 'ch-bot-12',
      'ch-zoo-01', 'ch-zoo-03', 'ch-zoo-09', 'ch-zoo-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-10-14-aakash-ct-1',
    name: 'AAKASH - CT-1 (Cumulative Test)',
    coachingName: 'Aakash',
    date: '2026-10-14',
    subjectOrScope: 'Cumulative Test: Comprehensive review of Aakash UT-1 to UT-6',
    linkedChapterIds: [
      'ch-phy-02', 'ch-phy-04', 'ch-phy-05', 'ch-phy-06', 'ch-phy-07', 'ch-phy-08', 'ch-phy-09', 'ch-phy-10', 'ch-phy-11', 'ch-phy-12', 'ch-phy-13', 'ch-phy-14', 'ch-phy-15', 'ch-phy-16',
      'ch-chm-01', 'ch-chm-02', 'ch-chm-03', 'ch-chm-04', 'ch-chm-05', 'ch-chm-06', 'ch-chm-07', 'ch-chm-08', 'ch-chm-09', 'ch-chm-10', 'ch-chm-14', 'ch-chm-16', 'ch-chm-17',
      'ch-bot-01', 'ch-bot-02', 'ch-bot-03', 'ch-bot-04', 'ch-bot-05', 'ch-bot-06', 'ch-bot-07', 'ch-bot-08', 'ch-bot-09', 'ch-bot-10', 'ch-bot-11', 'ch-bot-12',
      'ch-zoo-01', 'ch-zoo-02', 'ch-zoo-03', 'ch-zoo-04', 'ch-zoo-05', 'ch-zoo-06', 'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09', 'ch-zoo-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-10-21-aakash-ut-7',
    name: 'AAKASH - UT-7',
    coachingName: 'Aakash',
    date: '2026-10-21',
    subjectOrScope: 'Electric Charges & Field, Potential & Capacitance, Current Electricity | Alcohols, Phenols, Ethers, Aldehydes, Ketones, Acids | Molecular Genetics, Human Repro, Repro Health',
    linkedChapterIds: [
      'ch-phy-17', 'ch-phy-18', 'ch-phy-19',
      'ch-chm-18', 'ch-chm-19',
      'ch-bot-13',
      'ch-zoo-11', 'ch-zoo-12'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-10-25-allen-minor-7',
    name: 'ALLEN - MINOR TEST-7',
    coachingName: 'Allen',
    date: '2026-10-25',
    subjectOrScope: 'Thermal Physics, Ray Optics & Optical Instruments | Nomenclature, Isomerism, GOC, Organic Purification | Neural Control, Locomotion, Excretion, Endocrine',
    linkedChapterIds: [
      'ch-phy-13', 'ch-phy-14', 'ch-phy-25',
      'ch-chm-14', 'ch-chm-15',
      'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09', 'ch-zoo-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-10-25-aakash-aiats-pt-1',
    name: 'AAKASH - AIATS PT-1',
    coachingName: 'Aakash',
    date: '2026-10-25',
    subjectOrScope: 'Units, 1D & 2D Motion | Mole Concept, Atomic Structure | Cell Unit, Cell Cycle, Living World, Animal Tissues, Biomolecules',
    linkedChapterIds: [
      'ch-phy-02', 'ch-phy-04', 'ch-phy-05',
      'ch-chm-01', 'ch-chm-02',
      'ch-bot-01', 'ch-bot-06', 'ch-bot-07',
      'ch-zoo-02', 'ch-zoo-04'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= NOVEMBER 2026 =================
  {
    id: 'test-2026-11-01-allen-minor-8',
    name: 'ALLEN - MINOR TEST-8',
    coachingName: 'Allen',
    date: '2026-11-01',
    subjectOrScope: 'Properties of Matter & Fluids, Wave Optics | Hydrocarbons, Haloalkanes & Haloarenes | Evolution, Microbes, Health & Disease',
    linkedChapterIds: [
      'ch-phy-11', 'ch-phy-12', 'ch-phy-26',
      'ch-chm-16', 'ch-chm-17',
      'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-11-01-aakash-aiats-1',
    name: 'AAKASH - AIATS-1',
    coachingName: 'Aakash',
    date: '2026-11-01',
    subjectOrScope: 'Units, 1D Motion, 2D Motion | Mole Concept, Atomic Structure | Cell Unit, Cell Cycle, Living World, Animal Tissues, Biomolecules',
    linkedChapterIds: [
      'ch-phy-02', 'ch-phy-04', 'ch-phy-05',
      'ch-chm-01', 'ch-chm-02',
      'ch-bot-01', 'ch-bot-06', 'ch-bot-07',
      'ch-zoo-02', 'ch-zoo-04'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-11-15-aakash-ut-8',
    name: 'AAKASH - UT-8',
    coachingName: 'Aakash',
    date: '2026-11-15',
    subjectOrScope: 'Moving Charges & Magnetism, Magnetism & Matter | Amines, d- & f-Block | Microbes, Ecology, Health & Disease, Evolution',
    linkedChapterIds: [
      'ch-phy-20', 'ch-phy-21',
      'ch-chm-20', 'ch-chm-12',
      'ch-bot-16',
      'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-11-22-allen-review-2',
    name: 'ALLEN - REVIEW TEST-2',
    coachingName: 'Allen',
    date: '2026-11-22',
    subjectOrScope: 'Review Test: Topics covered in Allen Minor Tests 6, 7 & 8',
    linkedChapterIds: [
      'ch-phy-09', 'ch-phy-11', 'ch-phy-12', 'ch-phy-13', 'ch-phy-14', 'ch-phy-23', 'ch-phy-24', 'ch-phy-25', 'ch-phy-26',
      'ch-chm-11', 'ch-chm-12', 'ch-chm-13', 'ch-chm-14', 'ch-chm-15', 'ch-chm-16', 'ch-chm-17', 'ch-chm-22',
      'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18',
      'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09', 'ch-zoo-10', 'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-11-29-aakash-aiats-2',
    name: 'AAKASH - AIATS-2',
    coachingName: 'Aakash',
    date: '2026-11-29',
    subjectOrScope: 'Laws of Motion, Work Power Energy | Periodic Table, Chemical Bonding | Biological Class., Morphology of Plants, Breathing, Circulation',
    linkedChapterIds: [
      'ch-phy-06', 'ch-phy-07',
      'ch-chm-03', 'ch-chm-04',
      'ch-bot-02', 'ch-bot-04',
      'ch-zoo-05', 'ch-zoo-06'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= DECEMBER 2026 =================
  {
    id: 'test-2026-12-06-allen-minor-9',
    name: 'ALLEN - MINOR TEST-9',
    coachingName: 'Allen',
    date: '2026-12-06',
    subjectOrScope: 'Gravitation, Oscillations, Modern Physics (Dual Nature, Nuclei, Atoms) | Alcohols, Phenols, Ethers, Aldehydes, Ketones, Acids | Photosynthesis, Plant Respiration, Plant Growth',
    linkedChapterIds: [
      'ch-phy-10', 'ch-phy-15', 'ch-phy-27', 'ch-phy-28', 'ch-phy-29',
      'ch-chm-18', 'ch-chm-19',
      'ch-bot-08', 'ch-bot-09', 'ch-bot-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-12-13-aakash-pt-3',
    name: 'AAKASH - PT-3 (Part Test)',
    coachingName: 'Aakash',
    date: '2026-12-13',
    subjectOrScope: 'Part Test: Cumulative topics covered from Aakash UT-7 to UT-8',
    linkedChapterIds: [
      'ch-phy-17', 'ch-phy-18', 'ch-phy-19', 'ch-phy-20', 'ch-phy-21',
      'ch-chm-12', 'ch-chm-18', 'ch-chm-19', 'ch-chm-20',
      'ch-bot-13', 'ch-bot-16',
      'ch-zoo-11', 'ch-zoo-12', 'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-12-20-allen-minor-10',
    name: 'ALLEN - MINOR TEST-10',
    coachingName: 'Allen',
    date: '2026-12-20',
    subjectOrScope: 'Wave Motion, Semiconductors & Practical Skills | Biomolecules & Practical Chemistry | Human Repro, Flowering Plants Repro, Evolution',
    linkedChapterIds: [
      'ch-phy-16', 'ch-phy-30',
      'ch-chm-21', 'ch-chm-22',
      'ch-bot-11',
      'ch-zoo-11', 'ch-zoo-13'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2026-12-27-aakash-aiats-3',
    name: 'AAKASH - AIATS-3',
    coachingName: 'Aakash',
    date: '2026-12-27',
    subjectOrScope: 'Rotation, Gravitation, Solids, Fluids | Thermodynamics, Equilibrium, Redox, Electrochemistry | Plant Anatomy, Plant Kingdom, Excretion, Locomotion, Neural',
    linkedChapterIds: [
      'ch-phy-08', 'ch-phy-09', 'ch-phy-10', 'ch-phy-11', 'ch-phy-12',
      'ch-chm-05', 'ch-chm-06', 'ch-chm-07', 'ch-chm-09',
      'ch-bot-03', 'ch-bot-05',
      'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= JANUARY 2027 =================
  {
    id: 'test-2027-01-03-allen-semi-major-2',
    name: 'ALLEN - SEMI MAJOR TEST-2',
    coachingName: 'Allen',
    date: '2027-01-03',
    subjectOrScope: 'Semi Major Test: Cumulative syllabus of Allen Minor Tests 6 to 10',
    linkedChapterIds: [
      'ch-phy-09', 'ch-phy-10', 'ch-phy-11', 'ch-phy-12', 'ch-phy-13', 'ch-phy-14', 'ch-phy-15', 'ch-phy-16', 'ch-phy-23', 'ch-phy-24', 'ch-phy-25', 'ch-phy-26', 'ch-phy-27', 'ch-phy-28', 'ch-phy-29', 'ch-phy-30',
      'ch-chm-11', 'ch-chm-12', 'ch-chm-13', 'ch-chm-14', 'ch-chm-15', 'ch-chm-16', 'ch-chm-17', 'ch-chm-18', 'ch-chm-19', 'ch-chm-21', 'ch-chm-22',
      'ch-bot-08', 'ch-bot-09', 'ch-bot-10', 'ch-bot-11', 'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18',
      'ch-zoo-07', 'ch-zoo-08', 'ch-zoo-09', 'ch-zoo-10', 'ch-zoo-11', 'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-01-03-aakash-ut-9',
    name: 'AAKASH - UT-9',
    coachingName: 'Aakash',
    date: '2027-01-03',
    subjectOrScope: 'EMI, AC, EM Waves, Ray Optics & Optical Instruments | Coordination Compounds, Biomolecules | Ecosystem, Biotechnology Principles',
    linkedChapterIds: [
      'ch-phy-22', 'ch-phy-23', 'ch-phy-24', 'ch-phy-25',
      'ch-chm-13', 'ch-chm-21',
      'ch-bot-14', 'ch-bot-17'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-01-17-allen-major-1',
    name: 'ALLEN - MAJOR TEST-1',
    coachingName: 'Allen',
    date: '2027-01-17',
    subjectOrScope: 'Major Test: Entire 11th Class Complete Syllabus (Physics, Chemistry, Botany, Zoology)',
    linkedChapterIds: ALL_11TH_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-01-17-aakash-aiats-4',
    name: 'AAKASH - AIATS-4',
    coachingName: 'Aakash',
    date: '2027-01-17',
    subjectOrScope: 'Thermal Properties, Thermodynamics, Kinetic Theory, Oscillations, Waves | Solutions, Kinetics, GOC | Photosynthesis, Plant Respiration, Plant Growth, Endocrine, Animal Kingdom, Frog & Cockroach',
    linkedChapterIds: [
      'ch-phy-13', 'ch-phy-14', 'ch-phy-15', 'ch-phy-16',
      'ch-chm-08', 'ch-chm-10', 'ch-chm-14',
      'ch-bot-08', 'ch-bot-09', 'ch-bot-10',
      'ch-zoo-01', 'ch-zoo-03', 'ch-zoo-10'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-01-31-aakash-ut-10',
    name: 'AAKASH - UT-10',
    coachingName: 'Aakash',
    date: '2027-01-31',
    subjectOrScope: 'Wave Optics, Dual Nature, Atoms | p-Block Elements, Practical Chemistry | Biodiversity & Conservation, Biotech Applications, Evolution',
    linkedChapterIds: [
      'ch-phy-26', 'ch-phy-27', 'ch-phy-28',
      'ch-chm-11', 'ch-chm-22',
      'ch-bot-15', 'ch-bot-18',
      'ch-zoo-13'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= FEBRUARY 2027 =================
  {
    id: 'test-2027-02-07-allen-major-2',
    name: 'ALLEN - MAJOR TEST-2',
    coachingName: 'Allen',
    date: '2027-02-07',
    subjectOrScope: 'Major Test: Entire 12th Class Complete Syllabus (Physics, Chemistry, Botany, Zoology)',
    linkedChapterIds: ALL_12TH_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-02-07-aakash-aiats-5',
    name: 'AAKASH - AIATS-5',
    coachingName: 'Aakash',
    date: '2027-02-07',
    subjectOrScope: 'Electric Charges & Fields, Potential & Capacitance, Current Electricity | Hydrocarbons, Haloalkanes, Alcohols, Carbonyl Compounds | Flowering Plants Repro, Genetics I, Human Repro, Repro Health',
    linkedChapterIds: [
      'ch-phy-17', 'ch-phy-18', 'ch-phy-19',
      'ch-chm-16', 'ch-chm-17', 'ch-chm-18', 'ch-chm-19',
      'ch-bot-11', 'ch-bot-12',
      'ch-zoo-11', 'ch-zoo-12'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-02-14-allen-major-3',
    name: 'ALLEN - MAJOR TEST-3',
    coachingName: 'Allen',
    date: '2027-02-14',
    subjectOrScope: 'Full Syllabus Grand Mock Test (11th & 12th Complete NEET Pattern)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-02-21-aakash-ut-11',
    name: 'AAKASH - UT-11',
    coachingName: 'Aakash',
    date: '2027-02-21',
    subjectOrScope: 'Nuclei, Semiconductors, Experimental Skills | p-Block, Equilibrium, Aldehydes, Ketones & Acids | Ecology, Biotech, Human Repro',
    linkedChapterIds: [
      'ch-phy-29', 'ch-phy-30', 'ch-phy-31',
      'ch-chm-11', 'ch-chm-06', 'ch-chm-19',
      'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18',
      'ch-zoo-11'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= MARCH 2027 =================
  {
    id: 'test-2027-03-07-aakash-aiats-6',
    name: 'AAKASH - AIATS-6',
    coachingName: 'Aakash',
    date: '2027-03-07',
    subjectOrScope: 'Moving Charges, Magnetism, EMI, AC, EM Waves | Amines, d- & f-Block, Coordination Compounds | Molecular Genetics, Microbes, Evolution, Health & Disease',
    linkedChapterIds: [
      'ch-phy-20', 'ch-phy-21', 'ch-phy-22', 'ch-phy-23', 'ch-phy-24',
      'ch-chm-12', 'ch-chm-13', 'ch-chm-20',
      'ch-bot-13',
      'ch-zoo-13', 'ch-zoo-14', 'ch-zoo-15'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-03-14-aakash-pt-4',
    name: 'AAKASH - PT-4 (Part Test)',
    coachingName: 'Aakash',
    date: '2027-03-14',
    subjectOrScope: 'Part Test: Topics covered from Aakash UT-9 to UT-11',
    linkedChapterIds: [
      'ch-phy-22', 'ch-phy-23', 'ch-phy-24', 'ch-phy-25', 'ch-phy-26', 'ch-phy-27', 'ch-phy-28', 'ch-phy-29', 'ch-phy-30', 'ch-phy-31',
      'ch-chm-06', 'ch-chm-11', 'ch-chm-13', 'ch-chm-19', 'ch-chm-21', 'ch-chm-22',
      'ch-bot-14', 'ch-bot-15', 'ch-bot-17', 'ch-bot-18',
      'ch-zoo-11', 'ch-zoo-13'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-03-21-aakash-aiats-7',
    name: 'AAKASH - AIATS-7',
    coachingName: 'Aakash',
    date: '2027-03-21',
    subjectOrScope: 'Ray Optics, Wave Optics, Dual Nature, Atoms, Nuclei, Semiconductors, Practical Skills | p-Block, Biomolecules, Practical Chem | Ecology & Biotechnology Complete',
    linkedChapterIds: [
      'ch-phy-03', 'ch-phy-25', 'ch-phy-26', 'ch-phy-27', 'ch-phy-28', 'ch-phy-29', 'ch-phy-30', 'ch-phy-31',
      'ch-chm-11', 'ch-chm-21', 'ch-chm-22',
      'ch-bot-14', 'ch-bot-15', 'ch-bot-16', 'ch-bot-17', 'ch-bot-18'
    ],
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-03-26-aakash-fst-1',
    name: 'AAKASH - FST-1',
    coachingName: 'Aakash',
    date: '2027-03-26',
    subjectOrScope: 'Complete Syllabus Full Mock Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },

  // ================= APRIL 2027 =================
  {
    id: 'test-2027-04-04-aakash-aiats-8',
    name: 'AAKASH - AIATS-8',
    coachingName: 'Aakash',
    date: '2027-04-04',
    subjectOrScope: 'Full Syllabus All India Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-09-aakash-fst-2',
    name: 'AAKASH - FST-2',
    coachingName: 'Aakash',
    date: '2027-04-09',
    subjectOrScope: 'Full Syllabus Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-11-aakash-aiats-9',
    name: 'AAKASH - AIATS-9',
    coachingName: 'Aakash',
    date: '2027-04-11',
    subjectOrScope: 'Full Syllabus All India Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-16-aakash-fst-3',
    name: 'AAKASH - FST-3',
    coachingName: 'Aakash',
    date: '2027-04-16',
    subjectOrScope: 'Full Syllabus Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-18-aakash-aiats-10',
    name: 'AAKASH - AIATS-10',
    coachingName: 'Aakash',
    date: '2027-04-18',
    subjectOrScope: 'Full Syllabus All India Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-23-aakash-fst-4',
    name: 'AAKASH - FST-4',
    coachingName: 'Aakash',
    date: '2027-04-23',
    subjectOrScope: 'Full Syllabus Final Mock Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  },
  {
    id: 'test-2027-04-25-aakash-aiats-11',
    name: 'AAKASH - AIATS-11',
    coachingName: 'Aakash',
    date: '2027-04-25',
    subjectOrScope: 'Final Grand AIATS Full Syllabus Test - NEET Pattern (Class XI & XII)',
    linkedChapterIds: FULL_SYLLABUS_IDS,
    totalMarks: 720,
    createdAt: '2026-05-15'
  }
];

export const INITIAL_STUDY_LOGS: StudyLog[] = [];

export const INITIAL_TEST_SCORES: TestScore[] = [];
