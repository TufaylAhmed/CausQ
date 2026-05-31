# Company / partner logos  ← DROP YOUR LOGO FILES HERE

The auto-scrolling partner strip on the home page looks for a file in **this
folder** for each brand. For every brand it tries, in order:

1. `assets/img/company-logos/<slug>.svg`
2. `assets/img/company-logos/<slug>.png`
3. a plain text wordmark (only if neither file exists — so it never breaks)

So just save your uploaded logo here using the matching **slug** filename and it
appears automatically. SVG is best; transparent PNG is fine. Single-colour /
dark logos look best (the strip greyscales them and shows full colour on hover).

| Save as (slug)      | Brand                |
|---------------------|----------------------|
| `cisco.svg`         | Cisco                |
| `juniper.svg`       | Juniper Networks     |
| `arista.svg`        | Arista Networks      |
| `paloalto.svg`      | Palo Alto Networks   |
| `fortinet.svg`      | Fortinet             |
| `aruba.svg`         | HPE Aruba Networking |
| `extreme.svg`       | Extreme Networks     |
| `nvidia.svg`        | NVIDIA               |
| `nokia.svg`         | Nokia                |
| `vmware.svg`        | VMware               |
| `zscaler.svg`       | Zscaler              |
| `f5.svg`            | F5                   |

(`.png` works too — e.g. `cisco.png`.)

To change which brands show, or add new ones, edit the `PARTNERS` array in
`assets/js/main.js`. To rename a slug, update it there and name your file to match.

> Tip: tidy, evenly-sized logos read best. Aim for similar visual weight and a
> transparent background. Trim heavy padding so they align on the strip.

> Trademark note: only display logos of companies you partner with or are
> authorised to reference, per each brand's trademark-usage guidelines.
