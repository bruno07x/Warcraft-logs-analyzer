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
          kill
          friendlyPlayers
          friendlySpecs
        }
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
