import { Request } from "express";

export interface IShiftTime {
  hours: number;
  minutes: number;
}

export interface IUserDataForDB {
  id: string;
  email: string;
  shiftPattern: string;
  platoon: string;
  dayShiftStartTime: IShiftTime;
  dayShiftEndTime: IShiftTime;
  nightShiftStartTime: IShiftTime;
  nightShiftEndTime: IShiftTime;
  Rday?: string; // R1, R2 etc //
  hourlyWage: string;
}

export interface ISingleDaysPayDataForClient {
  date: Date;
  rotation: string; //Day 1, Day 2, Night 1 //
  shiftStart: Date;
  shiftEnd: Date;
  baseHoursWorked: number;
  getBaseWageEarnings: () => number;
  nightHoursWorked: number;
  getAlphaNightsTotal: () => number;
  getNightEarningsTotal: () => number;
  weekendHoursWorked: number;
  getWeekendTotal: () => number;
  getDayTotal: () => number;
}

export interface ITwoWeekPayPeriodForClient {
  payDay: Date;
  getBaseWageEarnings: () => number;
  getTotalEarnings: () => number;
  getNightHoursWorked: () => number;
  getBaseHoursWorkedInPayPeriod: () => number;
  getLevellingHours: () => number;
  getAlphaNightTotalEarnings: () => number;
  getNightShiftTotalEarnings: () => number;
  getWeekendTotalEarnings: () => number;
  payDaysInPayPeriod: ISingleDaysPayDataForClient[];
}

export interface IRequestForPayDayData extends Request {
  body: {
    userInfo: IUserDataForDB;
    requestedPayDays: string[];
  };
}
