import { Request } from "express";
import { DateTime } from "luxon";

export interface IShiftTime {
  hours: number;
  minutes: number;
}

export interface IPlatoonStart {
  [platoon: string]: number;
}

export interface IScheduleItem {
  date: Date;
  // rotation here with be "Day 1", "Day 2", "Night 1" etc.
  rotation: string;
}

export interface IDeductions {
  currentEIDeduction: number;
  YTDEIDeduction: number;
  currentCPPDeduction: number;
  YTDCPPDeduction: number;
  incomeTax?: number;
  pserpDeduction?: number;
  unionDues?: number;
  payDay: string;
  grossIncome: number;
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
  // base hours/wage are optional because in a regular overtime/holiday recall shift, they will be 0 and the hours/earnings will be logged under the regOT and holidayOT properties
  baseHoursWorked?: number;
  baseWageEarnings?: number;
  nightHoursWorked: number;
  alphaNightsEarnings: number;
  nightEarnings: number;
  weekendHoursWorked: number;
  weekendEarnings: number;
  dayTotal: number;
  stiipHours?: number;
  OTDoubleTime?: number;
  OTOnePointFive?: number;
}

export interface ITwoWeekPayPeriodForClient {
  payDay: Date;
  workDaysInPayPeriod: ISingleDaysPayDataForClient[];
}

export interface IRequestForPayDayData extends Request {
  body: {
    userInfo: IUserDataForDB;
    month: number;
    year: number;
  };
}

export interface IRequestForSinglePayDayData extends Request {
  body: {
    userInfo: IUserDataForDB;
    date: string;
    rotation: string;
    // optional properties sent with requests to delete singleDaysPayData from database when user deselects stiip or overtime
    collectionInDB?: string;
    monthAndYear?: string;
    // optional properties when requesting overtime shift data
    shiftStart?: Date;
    shiftEnd?: Date;
    // index is stored in the db with the overtime info so when it is fetched in the future it can be inserted at into response data at the correct index
    index?: number;
    payDay?: string;
    prevRotation?: string;

    month?: number;
    year?: number;
  };
}

export interface IRequestForWholeStiip extends Request {
  body: {
    userInfo: IUserDataForDB;
    date: string;
    rotation: string;
    // payDay, index, and wholeShift will be used for db queries
    payDay?: string;
    index?: number;
    wholeShift?: true;
  };
}

export interface IRequestForPartialStiip extends Request {
  body: {
    userInfo: IUserDataForDB;
    date: string;
    rotation: string;
    shiftStart: Date;
    originalShiftEnd: Date;
    updatedShiftEnd: Date;
    payDay: string;
    index: number;
  };
}
export interface IRequestForHolidayBlock extends Request {
  body: {
    userInfo: IUserDataForDB;
    vacationDates: IVacationDates[];
  };
}

export interface IVacationDates {
  date: Date;
  rotation: string;
  shiftStart: Date | string;
  shiftEnd: Date | string;
  payDay: string;
  index: number;
}

export interface IRequestForDeductionData extends Request {
  body: {
    userInfo: IUserDataForDB;
    grossIncome: number;
    stiipHours: number;
    OTOnePointFiveAmount?: number;
    OTDoubleTimeAmount?: number;
    incomeLessLevelling: number;
    payDay: string;
  };
}
