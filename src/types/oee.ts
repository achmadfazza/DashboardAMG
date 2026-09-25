export interface OeeDataPoint {
  name: string;
  oee: number;
  actual: number;
  target: number;
}

export interface SummaryCardData {
  oeePants: string;
  oeePantsColor: string;
  oeeNapkin: string;
  oeeNapkinColor: string;
  outPants: string;
  outNapkin: string;
}

export interface SummaryCardItem {
  title: string;
  accentColor: string;
  data: SummaryCardData;
}

export interface SummaryCardProps extends SummaryCardItem {
  month: string;
}

export interface OeeChartCardProps {
  title: string;
  tags: string;
  data: OeeDataPoint[];
  dataKeyActual?: string;
}

export interface ShiftRowProps {
  title: string;
  dataPants: OeeDataPoint[];
  dataNapkin: OeeDataPoint[];
}
