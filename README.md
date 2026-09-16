# Analyze Coverage by FCC PEA

GitHub Pages application for selecting one record from the Persistent Propagation Coverage layer and running Notebook 2.

## Included files

- `index.html`
- `styles.css`
- `config.js`
- `app.js`
- `oauth-callback.html`, copied from Esri's official JS API resources pattern
- `PARAMETERS.md`

## Configure

Edit `config.js` and replace:

- `portalUrl`
- `clientId`
- `webToolUrl`

Verify these persistent coverage fields:

- `TIFF_NAME`
- `RUN_DATETIME`
- `CREATED_BY`

## OAuth redirect URLs

Register both the repository root and callback page in the ArcGIS OAuth application, for example:

- `https://USERNAME.github.io/AnalyzeCoverageByPEA/`
- `https://USERNAME.github.io/AnalyzeCoverageByPEA/oauth-callback.html`

## Web tool contract

Inputs:

- `input_coverage_objectid`: Long, required
- `input_pea_num`: String, required
- `input_analysis_name`: String, required

Output:

- `output_summary`: String

## Deployment

Enable GitHub Pages from the repository's main branch and root folder. Test the page directly before embedding its URL in the Experience Builder Embed widget.
