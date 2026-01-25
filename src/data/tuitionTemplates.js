export const PROGRAMS = {
  MA: {
    label: "Master (MA)",
    tracks: {
      "4_TERMS": {
        label: "4 Terms (54,000)",
        termCount: 4,
        tuitionPerTerm: 10000,
        miscPerTerm: 3500,
      },
      "THESIS_5_TERMS": {
        label: "Thesis Track (5 Terms / 67,500)",
        termCount: 5,
        tuitionPerTerm: 10000,
        miscPerTerm: 3500,
      },
    },
    fees: {
      comprehensiveExam: 3500,
      preOral: 22000,
      finalOral: 27500,
      manuscriptProduction: 12500,
      graduation: 13000,
    },
  },

  PHD: {
    label: "PhD",
    tracks: {
      "NON_DISSERTATION_5_TERMS": {
        label: "Non-Dissertation Track (5 Terms / 80,000)",
        termCount: 5,
        tuitionPerTerm: 12000,
        miscPerTerm: 4000,
      },
      "DISSERTATION_6_TERMS": {
        label: "Dissertation Track (6 Terms / 96,000)",
        termCount: 6,
        tuitionPerTerm: 12000,
        miscPerTerm: 4000,
      },
    },
    fees: {
      comprehensiveExam: 4500,
      preOral: 28000,
      finalOral: 39000,
      manuscriptProduction: 15000,
      graduation: 14000,
    },
  },
};

export function buildSchoolItems(programKey, trackKey) {
  const program = PROGRAMS[programKey];
  const track = program.tracks[trackKey];

  const termTotal =
    track.termCount * (track.tuitionPerTerm + track.miscPerTerm);

  return [
    {
      description: `${program.label} - ${track.label} (Tuition + Misc)`,
      qty: 1,
      unitPrice: termTotal,
    },
    { description: "Comprehensive Examination Fee", qty: 1, unitPrice: program.fees.comprehensiveExam },
    { description: "Pre Oral Defense Fee (includes token/food/adviser)", qty: 1, unitPrice: program.fees.preOral },
    { description: "Final Oral Defense Fee (includes token/food/adviser)", qty: 1, unitPrice: program.fees.finalOral },
    { description: "Production of Final Manuscript", qty: 1, unitPrice: program.fees.manuscriptProduction },
    { description: "Graduation Fee", qty: 1, unitPrice: program.fees.graduation },
  ];
}
