import { Injectable } from '@nestjs/common';
import { POSITION_ABBREVIATIONS } from '../positions/positions.service';

export type FootballPosition = (typeof POSITION_ABBREVIATIONS)[number];
export interface TeamFormation {
  GK: number;
  DEF: number;
  MID: number;
  FWD: number;
}
export interface TeamGenerationPlayer {
  userId: string;
  mainPosition: FootballPosition;
  altPosition: FootballPosition;
  shirtNumber: number;
}
export interface GeneratedLineupPlayer {
  userId: string;
  assignedPosition: FootballPosition;
  shirtNumber: number;
}
export interface GeneratedTeams {
  home: GeneratedLineupPlayer[];
  away: GeneratedLineupPlayer[];
}
type TeamName = keyof GeneratedTeams;
interface FormationSlot {
  team: TeamName;
  position: FootballPosition;
  index: number;
}

@Injectable()
export class TeamGeneratorService {
  generate(
    inputPlayers: TeamGenerationPlayer[],
    formation: TeamFormation,
  ): GeneratedTeams {
    if (inputPlayers.length < 2 || inputPlayers.length % 2 !== 0)
      throw new Error('Team generation requires an even player count');
    if (
      new Set(inputPlayers.map((player) => player.userId)).size !==
      inputPlayers.length
    )
      throw new Error('Team generation requires unique players');
    const teamSize = inputPlayers.length / 2;
    const formationSize = POSITION_ABBREVIATIONS.reduce(
      (total, position) => total + formation[position],
      0,
    );
    if (formationSize !== teamSize)
      throw new Error('Formation size must equal team size');

    const players = [...inputPlayers].sort((left, right) =>
      left.userId.localeCompare(right.userId),
    );
    const slots = this.createSlots(formation);
    // A non-main penalty greater than the player count makes the objective
    // lexicographic: maximize main assignments, then alt, then minimize fallback.
    const nonMainPenalty = players.length + 1;
    const costs = players.map((player) =>
      slots.map((slot) => {
        if (slot.position === player.mainPosition) return 0;
        if (slot.position === player.altPosition) return nonMainPenalty;
        return nonMainPenalty + 1;
      }),
    );
    const assignedSlotByPlayer = this.minimumCostAssignment(costs);
    const teams: GeneratedTeams = { home: [], away: [] };
    players.forEach((player, playerIndex) => {
      const slot = slots[assignedSlotByPlayer[playerIndex]];
      teams[slot.team].push({
        userId: player.userId,
        assignedPosition: slot.position,
        shirtNumber: player.shirtNumber,
      });
    });
    for (const team of ['home', 'away'] as const) {
      teams[team].sort(
        (left, right) =>
          POSITION_ABBREVIATIONS.indexOf(left.assignedPosition) -
            POSITION_ABBREVIATIONS.indexOf(right.assignedPosition) ||
          left.userId.localeCompare(right.userId),
      );
    }
    return teams;
  }

  private createSlots(formation: TeamFormation): FormationSlot[] {
    const slots: FormationSlot[] = [];
    for (const position of POSITION_ABBREVIATIONS) {
      for (const team of ['home', 'away'] as const) {
        for (let index = 0; index < formation[position]; index += 1)
          slots.push({ team, position, index });
      }
    }
    return slots;
  }

  /** Hungarian assignment. Canonically sorted rows/columns and lowest-index ties make equal-cost results stable. */
  private minimumCostAssignment(costs: number[][]): number[] {
    const size = costs.length;
    const rowPotential = Array<number>(size + 1).fill(0);
    const columnPotential = Array<number>(size + 1).fill(0);
    const matchedRowByColumn = Array<number>(size + 1).fill(0);
    const previousColumn = Array<number>(size + 1).fill(0);
    for (let row = 1; row <= size; row += 1) {
      matchedRowByColumn[0] = row;
      let column = 0;
      const minimum = Array<number>(size + 1).fill(Number.POSITIVE_INFINITY);
      const used = Array<boolean>(size + 1).fill(false);
      do {
        used[column] = true;
        const matchedRow = matchedRowByColumn[column];
        let delta = Number.POSITIVE_INFINITY;
        let nextColumn = 0;
        for (let candidate = 1; candidate <= size; candidate += 1) {
          if (used[candidate]) continue;
          const reducedCost =
            costs[matchedRow - 1][candidate - 1] -
            rowPotential[matchedRow] -
            columnPotential[candidate];
          if (reducedCost < minimum[candidate]) {
            minimum[candidate] = reducedCost;
            previousColumn[candidate] = column;
          }
          if (minimum[candidate] < delta) {
            delta = minimum[candidate];
            nextColumn = candidate;
          }
        }
        for (let candidate = 0; candidate <= size; candidate += 1) {
          if (used[candidate]) {
            rowPotential[matchedRowByColumn[candidate]] += delta;
            columnPotential[candidate] -= delta;
          } else minimum[candidate] -= delta;
        }
        column = nextColumn;
      } while (matchedRowByColumn[column] !== 0);
      do {
        const prior = previousColumn[column];
        matchedRowByColumn[column] = matchedRowByColumn[prior];
        column = prior;
      } while (column !== 0);
    }
    const assignedColumnByRow = Array<number>(size).fill(0);
    for (let column = 1; column <= size; column += 1)
      assignedColumnByRow[matchedRowByColumn[column] - 1] = column - 1;
    return assignedColumnByRow;
  }
}
