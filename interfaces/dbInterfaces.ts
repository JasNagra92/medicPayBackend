import { Request } from "express";

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
  baseWageEarnings: number;
  nightHoursWorked: number;
  alphaNightsEarnings: number;
  nightEarnings: number;
  weekendHoursWorked: number;
  weekendEarnings: number;
  dayTotal: number;
  stiipHours?: number;
}

export interface ITwoWeekPayPeriodForClient {
  payDay: Date;
  workDaysInPayPeriod: ISingleDaysPayDataForClient[];
}

export interface IRequestForPayDayData extends Request {
  body: {
    userInfo: IUserDataForDB;
    monthAndYear: string;
  };
}

export interface IRequestForWholeStiip {
  body: {
    userInfo: IUserDataForDB;
    date: string;
    rotation: string;
  };
}
