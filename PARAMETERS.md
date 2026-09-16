# Notebook 2 parameter settings

## Inputs

### Coverage Record
- Variable name: `input_coverage_objectid`
- Display name: `Coverage Record`
- Data type: `Long`
- Direction: `Input`
- Required: `Yes`
- Default: blank

### FCC PEA Number
- Variable name: `input_pea_num`
- Display name: `FCC PEA Number`
- Data type: `String`
- Direction: `Input`
- Required: `Yes`
- Default: blank

### Analysis Name
- Variable name: `input_analysis_name`
- Display name: `Analysis Name`
- Data type: `String`
- Direction: `Input`
- Required: `Yes`
- Default: blank

## Output

### Output Summary
- Variable name: `output_summary`
- Display name: `Output Summary`
- Data type: `String`
- Direction: `Output`

## Expected layer fields

Persistent coverage layer:
- Object ID field reported by the service
- `TIFF_NAME`
- `RUN_DATETIME`
- `CREATED_BY` optional for display

Selected FCC PEA history layer:
- `SOURCE_COV_OID`
- `TIFF_NAME`
