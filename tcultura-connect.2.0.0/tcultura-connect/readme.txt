=== TCultura Connect ===
Contributors: datacultura
Tags: culture, events, api, integration, chile
Requires at least: 5.8
Tested up to: 6.9
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display cultural events and activities from the TCultura / DataCultura platform on your WordPress site.

== Description ==

TCultura Connect allows you to seamlessly display cultural events and activities from the **TCultura / DataCultura** platform directly on your WordPress website.

Ideally suited for organizations, municipalities, and cultural centers using DataCultura management software.

### Features
* **Simple Integration:** Connect via API Key in seconds.
* **Automatic Bootstrap:** Optionally load the API Key from `TCULTURA_API_KEY.txt` or the `TCULTURA_API_KEY` environment variable.
* **Flexible Filtering:** Show/hide events or activities as needed.
* **Date Ranges:** Filter content by upcoming 7, 15, 30, 90 days, or show all.
* **Customization:** Choose an accent color for the "Register" (Inscribirse) buttons to match your theme.
* **Developer Friendly:** Clean code structure and documented API usage.

### Technical Requirements

| Requirement | Minimum |
|-------------|---------|
| WordPress   | 5.8     |
| PHP         | 7.4     |
| API Key     | Required|

### APIs Consumed
This plugin connects to the TCultura B2B API to fetch real-time data using the `X-Project-Api-Key` header:
* `/api/b2b/info/` (GET) - Project information.
* `/api/b2b/eventos/` (GET) - Paginated events.
* `/api/b2b/actividades/` (GET) - Paginated activities.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/tcultura-connect` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Go to the **TCultura** menu in your dashboard.
4. Enter your **API Key** and click "Save", or place it in a local `TCULTURA_API_KEY.txt` file before activation.

== Frequently Asked Questions ==

= How do I get my API Key? =
1. Visit [datacultura.org](https://datacultura.org) and request access for your organization.
2. Once approved, log in to your TCultura dashboard.
3. Navigate to **Configuración del Proyecto → API**.
4. Copy the key and paste it into the plugin settings page.

= Can I keep the API Key outside WordPress settings? =
Yes. The plugin checks the `TCULTURA_API_KEY` environment variable first. If it is not present, it also looks for a local `TCULTURA_API_KEY.txt` file in the plugin folder and in nearby parent folders commonly used in local development setups.

= How do I display the events? =
Simply insert the following shortcode on any page or post:
`[tcultura_eventos]`

= Can I customize the colors? =
Yes. Go to the TCultura settings page in your WordPress dashboard. You can select a custom color for the action buttons.

== Screenshots ==

1. The main settings panel where you input the API Key.
2. Example of the events list displayed on the frontend.

== External services ==

This plugin connects to the **TCultura B2B API** to retrieve cultural events and activities managed on the TCultura platform by your organization.

= What is the service? =
TCultura (https://tcultura.com) is a SaaS platform for cultural management, event coordination, and socioemotional impact measurement, developed by Data Cultura (https://datacultura.org).

= What data is sent and when? =
* The plugin sends **only the site administrator's API Key** (via the `X-Project-Api-Key` HTTP header) to `https://tcultura.com/api/b2b/`.
* Requests are made when a page containing the `[tcultura_eventos]` shortcode is loaded by any visitor, or when the administrator tests the connection from the plugin settings page.
* **No visitor data is collected or transmitted.** No cookies are set. No personal information from site visitors is sent to TCultura.

= Service links =
* Terms of Use: https://tcultura.com/eventos/terminos-de-uso/
* Privacy Policy: https://tcultura.com/eventos/politica-de-privacidad/
* Service homepage: https://tcultura.com

== Changelog ==

= 1.0.0 =
* Initial release.
* Added API connection to TCultura.
* Added `[tcultura_eventos]` shortcode.
* Added settings page with color picker and filters.

== Upgrade Notice ==

= 1.0.0 =
This is the first version of TCultura Connect.

== Credits ==

Copyright 2026 TCultura by [Data Cultura](https://datacultura.org).
