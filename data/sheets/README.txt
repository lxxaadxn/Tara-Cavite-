Tara, Cavite! — Excel / Google Sheets import (4 tabs = 4 CSV files)
================================================================

Files in this folder match the column layout from your "Terminals Data Set" workbook:

  1. Terminals.csv          — Terminal_Id, Terminal_Name, Terminal_Province, Terminal_City,
                             Terminal_Brgy, First_Trip, Last_Trip
  2. Transport_Types.csv   — Transport_Type_Id, Transport_Name
  3. Routes.csv             — Route_Id, Route_Name, Origin, Destination
  4. Terminal_Routes.csv    — Terminal_Route_Id, Terminal_Id, Route_Id, Transport_Type_Id

How to refresh (after editing data/terminals_cavite_updated.csv):

  npm run sheets:all

That will:
  - Rebuild data/terminals_cavite_rows.json from the terminals CSV
  - Regenerate these four sheet CSVs plus JSON used by the app
  - Regenerate supabase/terminal_dataset_seed.sql
