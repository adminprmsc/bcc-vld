export type DueDiligenceInputType = 'text' | 'textarea' | 'number' | 'currency' | 'percent';

export interface DueDiligenceQuestion {
  id: string;
  prompt: string;
  type: DueDiligenceInputType;
  placeholder?: string;
  helper?: string;
  options?: string[];
}

const YES_NO = ['Yes', 'No'];

export const GOVT_LAND_QUESTIONS: DueDiligenceQuestion[] = [
  { id: 'G1', prompt: 'Option number', type: 'text', placeholder: 'Mention number 1,2,3…' },
  { id: 'G2', prompt: 'Was state land available?', type: 'text', options: YES_NO },
  { id: 'G3', prompt: 'Is community land available?', type: 'text', options: YES_NO },
  {
    id: 'G4',
    prompt: 'Type of land',
    type: 'text',
    placeholder: 'Agricultural (Fertile/Barren), Residential, Commercial, Lease, etc.'
  },
  {
    id: 'G5',
    prompt:
      'Is this category jointly recognized by revenue administration, VO and project staff?',
    type: 'text',
    options: YES_NO
  },
  { id: 'G6', prompt: 'Area of land (marla)', type: 'number', placeholder: 'Enter area in marla' },
  {
    id: 'G7',
    prompt: 'Ownership / allotment of land in favor of',
    type: 'text',
    placeholder: 'Federal Govt, Provincial Dept, Leased, Shamilat, etc.'
  },
  {
    id: 'G8',
    prompt: 'Name of department / land title',
    type: 'text',
    placeholder: 'Name on which the land rests (fard malkiyat)'
  },
  {
    id: 'G9',
    prompt: 'Attach fard malkiyat',
    type: 'text',
    helper: 'Upload the supporting PDF in the Supporting Documents field and note the file name here.'
  },
  {
    id: 'G10',
    prompt: 'Is the land under legal encumbrance (legal proceedings / stay)?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G11',
    prompt: 'Is there any social or legal dispute on the land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G12',
    prompt: 'Can the mutation / allotment take place immediately in favor of PRMSC LG&CDD?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G13',
    prompt: 'Is the department willing to give NOC for transferring the land to PRMSC LG&CDD?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G14',
    prompt: 'Attach NOC / requisition from line department',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'G15',
    prompt: 'Does revenue department allow utilization of land for the project?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G16',
    prompt: "Attach the revenue department's requisition letter",
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'G17',
    prompt: 'Structures / assets on land (including crops) and cost (PKR)',
    type: 'currency',
    placeholder: 'Mention cost in PKR'
  },
  {
    id: 'G18',
    prompt: 'Is there any impact on livelihood involved?',
    type: 'text',
    options: YES_NO
  },
  { id: 'G19', prompt: 'Is there any relocation involved?', type: 'text', options: YES_NO },
  { id: 'G20', prompt: 'DC value of land (PKR)', type: 'currency', placeholder: 'Enter value in PKR' },
  {
    id: 'G21',
    prompt: 'Market value of land (PKR)',
    type: 'currency',
    placeholder: 'Enter value in PKR'
  },
  {
    id: 'G22',
    prompt: 'Is the consultation meeting conducted?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G23',
    prompt: 'Does the VO consent to the utilization of state land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G24',
    prompt: 'Attach VO consent form',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'G25',
    prompt: 'Do the neighbours consent to the utilization of state land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G26',
    prompt: "Attach neighbourers' consent form",
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'G27',
    prompt: 'Is the GRM process explained to the donor and the community?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G28',
    prompt: 'Is land viable and meeting social due diligence criteria?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G29',
    prompt: 'Are any SOP provisions required to be relaxed for obtaining the land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'G30',
    prompt: 'Mention the relaxation numbers (which Sr. Nos. need to be relaxed)',
    type: 'text',
    placeholder: 'Reference question numbers to be relaxed'
  },
  {
    id: 'G31',
    prompt: 'Rationale for relaxing the SOPs',
    type: 'textarea',
    placeholder: 'Provide justification and proofs'
  },
  {
    id: 'G32',
    prompt: 'Potential implications of relaxing the SOPs',
    type: 'textarea',
    placeholder: 'Detail legal, financial, social or other risks'
  },
  {
    id: 'G33',
    prompt: 'How will these implications be mitigated?',
    type: 'textarea',
    placeholder: 'Explain mitigation measures and steps'
  },
  {
    id: 'G34',
    prompt: 'Attach relevant proofs',
    type: 'text',
    helper: 'Upload supporting proofs in Supporting Documents and reference them here.'
  }
];

export const PRIVATE_LAND_QUESTIONS: DueDiligenceQuestion[] = [
  { id: 'P1', prompt: 'Option number', type: 'text', placeholder: 'Mention number 1,2,3…' },
  { id: 'P2', prompt: 'Was state land available?', type: 'text', options: YES_NO },
  { id: 'P3', prompt: 'Is community land available?', type: 'text', options: YES_NO },
  {
    id: 'P4',
    prompt: 'Reasons for VLD despite availability of state / community land',
    type: 'textarea',
    placeholder: 'State the reasons'
  },
  {
    id: 'P5',
    prompt: 'Comparative analysis for selecting this land over other options',
    type: 'textarea',
    placeholder: 'State the reasons'
  },
  {
    id: 'P6',
    prompt: 'Comparative cost analysis versus other options',
    type: 'textarea',
    placeholder: 'State the reasons'
  },
  { id: 'P7', prompt: 'Is the donor from vulnerable group?', type: 'text', options: YES_NO },
  {
    id: 'P8',
    prompt: 'Is the land donor vulnerable according to provincial poverty line?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P9',
    prompt: 'Is the female land donor head of the household?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P10',
    prompt: 'Type of land',
    type: 'text',
    placeholder: 'Agricultural (Fertile/Barren), Residential, Commercial, Lease, etc.'
  },
  {
    id: 'P11',
    prompt:
      'Is this category jointly recognized by revenue administration, VO and project staff?',
    type: 'text',
    options: YES_NO
  },
  { id: 'P12', prompt: 'Area of land (marla)', type: 'number', placeholder: 'Enter area in marla' },
  { id: 'P13', prompt: 'Name of donor', type: 'text', placeholder: 'Full name' },
  { id: 'P14', prompt: 'Gender', type: 'text', placeholder: 'Male / Female / Other' },
  {
    id: 'P15',
    prompt: 'Title of the landholding (name on fard malkiyat)',
    type: 'text',
    placeholder: 'Registered owner name'
  },
  {
    id: 'P16',
    prompt: 'Attach fard malkiyat',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  { id: 'P17', prompt: "Is the land on donor's name?", type: 'text', options: YES_NO },
  { id: 'P18', prompt: 'Is the land pledged?', type: 'text', options: YES_NO },
  {
    id: 'P19',
    prompt: 'Is the land under legal encumbrance (legal proceedings / stay)?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P20',
    prompt: 'Is there any social / legal dispute on the land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P21',
    prompt: 'Can the mutation take place immediately in favor of PRMSC LG&CDD?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P22',
    prompt: 'Is the donor willing to donate land and complete the mutation process?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P23',
    prompt: 'Attach affidavit / bayan-i-halfi',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  { id: 'P24', prompt: 'Is the land leased to another person?', type: 'text', options: YES_NO },
  { id: 'P25', prompt: 'Impacts on the lessor (financial cost)', type: 'textarea' },
  { id: 'P26', prompt: 'Total landholding of the donor (marla)', type: 'number' },
  {
    id: 'P27',
    prompt: 'Attach fard malkiyat of total landholdings',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'P28',
    prompt: 'Structures / assets on land (including crops) and cost (PKR)',
    type: 'currency',
    placeholder: 'Mention cost in PKR'
  },
  { id: 'P29', prompt: 'Are total land holdings more than 2 kanal?', type: 'text', options: YES_NO },
  { id: 'P30', prompt: 'Are total land holdings more than 25 kanal?', type: 'text', options: YES_NO },
  {
    id: 'P31',
    prompt: 'Is there any impact on livelihood involved?',
    type: 'text',
    options: YES_NO
  },
  { id: 'P32', prompt: 'Is there any relocation involved?', type: 'text', options: YES_NO },
  {
    id: 'P33',
    prompt: 'Percentage of land being donated',
    type: 'percent',
    placeholder: 'Donated land * 100 / total landholding'
  },
  { id: 'P34', prompt: 'DC value of land (PKR)', type: 'currency', placeholder: 'Enter value in PKR' },
  { id: 'P35', prompt: 'Market value of land (PKR)', type: 'currency', placeholder: 'Enter value in PKR' },
  { id: 'P36', prompt: 'Is the consultation meeting conducted?', type: 'text', options: YES_NO },
  { id: 'P37', prompt: 'Does the VO consent to the donation?', type: 'text', options: YES_NO },
  {
    id: 'P38',
    prompt: 'Attach VO consent form',
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'P39',
    prompt: 'Do the neighbours consent to the donation?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P40',
    prompt: "Attach neighbourers' consent form",
    type: 'text',
    helper: 'Upload PDF in Supporting Documents and reference it here.'
  },
  {
    id: 'P41',
    prompt: 'Is the GRM process explained to the donor and the community?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P42',
    prompt: 'Does the donor know they or their heirs cannot exercise rights on donated land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P43',
    prompt: 'Does the donor know they will have equal access to services?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P44',
    prompt: 'Is the donor willing to pay taxes / charges associated with the donation?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P45',
    prompt: 'Is land viable and meeting social due diligence criteria?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P46',
    prompt: 'Are any SOP provisions required to be relaxed for obtaining the land?',
    type: 'text',
    options: YES_NO
  },
  {
    id: 'P47',
    prompt: 'Mention relaxation numbers (which Sr. Nos. need to be relaxed)',
    type: 'text',
    placeholder: 'Reference question numbers to be relaxed'
  },
  {
    id: 'P48',
    prompt: 'Rationale for relaxing the SOPs',
    type: 'textarea',
    placeholder: 'Provide justification and proofs'
  },
  {
    id: 'P49',
    prompt: 'Potential implications of relaxing the SOPs',
    type: 'textarea',
    placeholder: 'Detail legal, financial, social or other risks'
  },
  {
    id: 'P50',
    prompt: 'How will these implications be mitigated?',
    type: 'textarea',
    placeholder: 'Explain mitigation measures and steps'
  },
  {
    id: 'P51',
    prompt: 'Attach relevant proofs',
    type: 'text',
    helper: 'Upload supporting proofs in Supporting Documents and reference them here.'
  }
];
