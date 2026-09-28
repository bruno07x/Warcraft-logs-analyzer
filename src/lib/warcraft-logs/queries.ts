/** Metadados do relatório, luta, jogadores e habilidades usados pela análise. */
export const REPORT_METADATA_QUERY = `
  query ReportMetadata($code: String!, $fightIDs: [Int!]) {
    reportData {
      report(code: $code, allowUnlisted: false) {
        code
        fights(fightIDs: $fightIDs, translate: true) {
          id
          encounterID
          name
          startTime
          endTime
          difficulty
          keystoneLevel
          kill
          friendlyPlayers
          friendlySpecs
        }
        playerDetails(fightIDs: $fightIDs, includeCombatantInfo: true)
        masterData(translate: true) {
          actors { id name type subType petOwner }
          abilities { gameID name }
        }
      }
    }
  }
`;

/** Uma página de casts concluídos do ator e da luta selecionados. */
export const REPORT_CASTS_QUERY = `
  query ReportCasts(
    $code: String!
    $fightIDs: [Int!]
    $sourceID: Int!
    $startTime: Float!
    $endTime: Float!
  ) {
    reportData {
      report(code: $code, allowUnlisted: false) {
        events(
          dataType: Casts
          fightIDs: $fightIDs
          sourceID: $sourceID
          startTime: $startTime
          endTime: $endTime
          limit: 10000
          useAbilityIDs: true
          useActorIDs: true
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

export const RANKING_CANDIDATES_QUERY = `
  query RankingCandidates($encounterID: Int!, $difficulty: Int!, $bracket: Int!, $metric: CharacterRankingMetricType!, $className: String!, $specName: String!, $page: Int!) {
    worldData { encounter(id: $encounterID) {
      characterRankings(difficulty: $difficulty, bracket: $bracket, metric: $metric, className: $className, specName: $specName, page: $page)
    }}
  }
`;

export const REPORT_ACTORS_QUERY = `
  query ReportActors($code: String!, $fightIDs: [Int!]) {
    reportData { report(code: $code, allowUnlisted: false) {
      fights(fightIDs: $fightIDs) { id friendlyPlayers }
      masterData { actors { id name type subType petOwner } }
    }}
  }
`;

export const REPORT_RANKINGS_QUERY = `
  query ReportRankings($code: String!, $fightIDs: [Int!], $playerMetric: ReportRankingMetricType!) {
    reportData { report(code: $code, allowUnlisted: false) { rankings(fightIDs: $fightIDs, playerMetric: $playerMetric) } }
  }
`;
