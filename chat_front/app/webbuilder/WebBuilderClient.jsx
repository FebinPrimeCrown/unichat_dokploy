"use client"
import { useEffect,useState, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'grapesjs/dist/css/grapes.min.css';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;



import './style.css'; // Import your custom styles

let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
    }
    else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

export default function WebBuilderClient({ canView, canEdit }) {  const editorRef = useRef(null); // Create a ref to store the editor instance
  const [uuid, setUuid] = useState(null);
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    console.log('canView:', canView);
    console.log('canEdit:', canEdit);
  }, [canView, canEdit]);
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleToastClose = () => setShowToast(false);

  useEffect(() => {
    // Initialize the GrapesJS editor

    editorRef.current = grapesjs.init({
      container: "#gjs",
      fromElement: true,
      height: "100%",
      width: "100%",
      storageManager: false,
      allowScripts: 1,
      assetManager: {
        custom: true,
        assets: [
          {
            src: "https://www.shutterstock.com/shutterstock/photos/1505210795/display_1500/stock-vector-hi-hello-banner-speech-bubble-poster-and-sticker-concept-with-text-hello-white-bubble-message-1505210795.jpg",
            height: 350,
            width: 250,
            name: "Sample Image",
          },
        ],
      },
      plugins: ["grapesjs-plugin-export", "grapesjs-touch"],
      pluginsOpts: {
        "grapesjs-plugin-export": {
          root: {
            css: {
              "style.css": (ed) => ed.getCss(), // Export CSS
            },
            img: async (ed) => {
              const images = {};
              const imageComponents = ed
                .getComponents()
                .filter((comp) => comp.is("image"));

              for (const img of imageComponents) {
                const src = img.get("src");

                if (src.startsWith("data:")) {
                  // Handle data URLs
                  const data = src.split(",")[1];
                  const mime = src.split(";")[0].split(":")[1];
                  const ext = mime.split("/")[1];
                  const filename = `image-${img.cid}.${ext}`;
                  images[filename] = atob(data); // Decode base64 data
                } else {
                  // Handle external links or local images
                  const urlParts = src.split("/");
                  const filename = urlParts[urlParts.length - 1]; // Get the file name from the URL
                  const isLocal = src.startsWith("/"); // Check if it's a local image

                  if (isLocal) {
                    // Assuming you have a way to access the local file or serve it correctly
                    const localFilePath = `path/to/your/public/directory${src}`; // Adjust the path as necessary
                    // Here, you might fetch the file as a Blob and convert it to a Base64 string or read it directly
                    const response = await fetch(localFilePath);
                    const blob = await response.blob();
                    const reader = new FileReader();

                    // Convert Blob to Base64
                    reader.onloadend = function () {
                      const base64data = reader.result;
                      images[filename] = base64data.split(",")[1]; // Store just the base64 string
                    };
                    reader.readAsDataURL(blob);
                  } else {
                    // For external links, just store the URL
                    images[filename] = src;
                  }
                }
              }

              return images; // Return the image object
            },
            "index.html": (ed) => `
              <html>
                <head>
                  <link rel="stylesheet" href="css/style.css">
                </head>
                <body>${ed.getHtml()}</body>
              </html>
            `,
          },
        },
      },
      panels: { defaults: [] },
      blockManager: canEdit? {
        blocks: [
          {
            id: "1column1",
            label: "1-Column Layout",
            category: "Layouts",
            content: `
              <section class="column-layout">
                <div class="column"></div>
              </section>
              <style>
                .column-layout .column {
                  width: 100%;
                  height: 400px;
                  background-color: #f0f0f0;
                  padding: 20px;
                  box-sizing: border-box;
                }
                @media (max-width: 768px) {
                  .column-layout .column {
                    padding: 10px;
                  }
                }
              </style>
            `,
            attributes: { class: "fa fa-square" }, // A single rectangle for 1 column
          },
          {
            id: "2column1",
            label: "2-Column Layout",
            category: "Layouts",
            content: `
              <section class="column-layout">
                <div class="column"></div>
                <div class="column"></div>
              </section>
              <style>
                .column-layout {
                  display: flex;
                }
                .column-layout .column {
                  width: 50%;
                  height: 400px;
                  background-color: #f0f0f0;
                  padding: 20px;
                  box-sizing: border-box;
                }
                @media (max-width: 768px) {
                  .column-layout {
                    flex-direction: column;
                  }
                  .column-layout .column {
                    width: 100%;
                    padding: 10px;
                  }
                }
              </style>
            `,
            attributes: { class: "fa fa-columns" }, // Two side-by-side rectangles for 2 columns
          },
          {
            id: "3column1",
            label: "3-Column Layout",
            category: "Layouts",
            content: `
              <section class="column-layout">
                <div class="column"></div>
                <div class="column"></div>
                <div class="column"></div>
              </section>
              <style>
                .column-layout {
                  display: flex;
                }
                .column-layout .column {
                  width: 33.33%;
                  height: 400px;
                  background-color: #f0f0f0;
                  padding: 20px;
                  box-sizing: border-box;
                }
                @media (max-width: 768px) {
                  .column-layout {
                    flex-direction: column;
                  }
                  .column-layout .column {
                    width: 100%;
                    padding: 10px;
                  }
                }
              </style>
            `,
            attributes: { class: "fa fa-th-large" }, // Three side-by-side rectangles for 3 columns
          },
          {
            id: "map1",
            label: "Map Embed",
            category: "Embeds",
            content: `
              <section class="embed-container">
                <div class="map">
                  <iframe width="500" height="300" src="https://maps.google.com/maps?q=&t=&z=17&ie=UTF8&iwloc=&output=embed" frameborder="0" style="border: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%;" allowfullscreen></iframe>
                </div>
              </section>
              <style>
                .embed-container .map {
                  width: 100%;
                  height: 355px;
                  position: relative;
                }
                .embed-container .map iframe {
                  width: 100%;
                  height: 100%;
                  position: absolute;
                  top: 0;
                  left: 0;
                }
                @media (max-width: 768px) {
                  .embed-container .map {
                    height: 300px;
                  }
                }
              </style>
            `,
            attributes: { class: "fa fa-map-marker" },
          },
          {
            id: "youtube1",
            label: "YouTube Embed",
            category: "Embeds",
            content: `
              <section class="embed-container">
                <div class="youtube">
                  <iframe width="500" height="300" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" style="border: 0; position: block; top: 0; left: 0; width: 100%; height: 100%;" allowfullscreen></iframe>
                </div>
              </section>
              <style>
                .embed-container .youtube {
                  width: 100%;
                  height: 350px;
                  position: relative;
                }
                .embed-container .youtube iframe {
                  width: 100%;
                  height: 100%;
                  position: absolute;
                  top: 0;
                  left: 0;
                }
                @media (max-width: 768px) {
                  .embed-container .youtube {
                    height: 300px;
                  }
                }
              </style>
            `,
            attributes: { class: "fa fa-youtube" },
          },
        ],
        appendTo: ".block-container",
      }: null,
      layerManager: canEdit?{
        appendTo: ".layers-container",
      }: null,
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet", width: "770px", widthMedia: "680px" },
          { name: "Mobile", width: "320px", widthMedia: "480px" },
        ],
      },
      panels: {
        defaults: [
          {
            id: "panel-devices",
            el: ".panel__devices",
            buttons: [
              {
                id: "device-desktop",
                label:
                  '<svg fill="#FFFDD0" width="24" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon line-color"><rect id="primary" x="2.5" y="3" width="19" height="18" rx="1" style="fill: none; stroke: #FFFDD0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></rect></svg>',
                command: "set-device-desktop",
                active: true,
                togglable: false,
              },
              {
                id: "device-tablet",
                label:
                  '<svg fill="#FFFDD0" width="24" height="20" viewBox="0 0 24 24" id="tablet" data-name="Line Color" xmlns="http://www.w3.org/2000/svg" class="icon line-color"><line id="secondary-upstroke" x1="12" y1="17" x2="12" y2="17" style="fill: none; stroke: #FFFDD0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></line><rect id="primary" x="5" y="3" width="14" height="18" rx="1" style="fill: none; stroke: #FFFDD0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></rect></svg>',
                command: "set-device-tablet",
                togglable: true,
                active: false,
              },
              {
                id: "device-mobile",
                label:
                  '<svg fill="#FFFDD0" width="24" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon line-color"><line id="secondary-upstroke" x1="12" y1="17" x2="12" y2="17" style="fill: none; stroke: #FFFDD0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></line><rect id="primary" x="6.5" y="3" width="11" height="18" rx="1" style="fill: none; stroke: #FFFDD0; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></rect></svg>',
                command: "set-device-mobile",
                togglable: true,
                active: false,
              },
            ],
          },
          {
            id: "layers",
            el: ".panel__right",
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: 0,
              cl: 1,
              cr: 0,
              bc: 0,
              keyWidth: "flex-basis",
            },
          },
          {
            id: "panel-switcher",
            el: ".panel__switcher",
            buttons: canEdit? [
              {
                id: "import-code",
                className: "fa fa-arrow-left",
                command: "import-code",
                active: false,
                togglable: false,
              },
              {
                id: "undo",
                className: "fa fa-arrow-left",
                command: "undo",
                active: false,
                togglable: false,
              },
              {
                id: "redo",
                className: "fa fa-arrow-right",
                command: "redo",
                active: false,
                togglable: false,
              },
              {
                id: "clear-all",
                className: "fa fa-trash",
                command: "clear-all",
                active: false,
                togglable: false,
              },

              {
                id: "show-blocks",
                active: true,

                className: "fa fa-th",
                command: "show-blocks",
                togglable: false,
              },

              {
                id: "show-layers",
                active: true,
                className: "fa fa-object-group",
                command: "show-layers",
                // Once activated disable the possibility to turn it off
                togglable: false,
              },
              {
                id: "show-style",
                active: true,
                className: "fa fa-paint-brush",
                command: "show-styles",
                togglable: false,
              },
              {
                id: "show-traits",
                active: true,
                className: "fa fa-cogs",
                command: "show-traits",
                togglable: false,
              },
              {
                id: "upload",
                active: true,
                className: "fa fa-upload",
                command: "upload-images", // Command for upload
                togglable: false,
              },
              {
                id: "save-website",
                label: "Save Website",
                command: "save-website",
                active: false,
                togglable: true,
                className: "custom-save-button", // Class for external CSS styling
                style: {
                  backgroundColor: "#007bff",
                  color: "#fff",
                  padding: "8px 16px",
                  fontSize: "16px",
                  borderRadius: "4px",
                },
              },
            ] : [],
          },
        ],
      },
      selectorManager:canEdit? {
        appendTo: ".styles-container",
      }:null,
      styleManager:canEdit? {
        appendTo: ".styles-container",
        sectors: [
          {
            name: "General",
            open: true,
            buildProps: [
              "display",
              "position",
              "top",
              "right",
              "bottom",
              "left",
            ],
            properties: [
              {
                type: "select",
                label: "Display",
                property: "display",
                default: "block",
                options: [
                  { id: "block", label: "Block" },
                  { id: "inline", label: "Inline" },
                  { id: "inline-block", label: "Inline Block" },
                  { id: "flex", label: "Flex" },
                  { id: "none", label: "None" },
                ],
              },
              {
                type: "select",
                label: "Position",
                property: "position",
                default: "static",
                options: [
                  { id: "static", label: "Static" },
                  { id: "relative", label: "Relative" },
                  { id: "absolute", label: "Absolute" },
                  { id: "fixed", label: "Fixed" },
                  { id: "sticky", label: "Sticky" },
                ],
              },
              {
                type: "number",
                label: "Top",
                property: "top",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Right",
                property: "right",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Bottom",
                property: "bottom",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Left",
                property: "left",
                units: ["px", "%", "em", "rem"],
              },
            ],
          },
          {
            name: "Dimensions",
            open: false,
            buildProps: [
              "width",
              "height",
              "max-width",
              "max-height",
              "min-width",
              "min-height",
            ],
            properties: [
              {
                type: "number",
                label: "Width",
                property: "width",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Height",
                property: "height",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Max Width",
                property: "max-width",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Max Height",
                property: "max-height",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Min Width",
                property: "min-width",
                units: ["px", "%", "em", "rem"],
              },
              {
                type: "number",
                label: "Min Height",
                property: "min-height",
                units: ["px", "%", "em", "rem"],
              },
            ],
          },
          {
            name: "Typography",
            open: false,
            buildProps: [
              "font-family",
              "font-size",
              "color",
              "font-weight",
              "text-align",
              "line-height",
              "letter-spacing",
            ],
            properties: [
              {
                type: "select",
                label: "Font Family",
                property: "font-family",
                options: [
                  {
                    id: "Montserrat, sans-serif",
                    label: "Montserrat",
                  },
                  {
                    id: "Roboto, sans-serif",
                    label: "Roboto",
                  },
                  {
                    id: "Noto Sans, sans-serif",
                    label: "Noto Sans",
                  },
                  {
                    id: "Raleway, sans-serif",
                    label: "Raleway",
                  },
                  {
                    id: "Arial, Helvetica, sans-serif",
                    label: "Arial",
                  },
                  {
                    id: "Georgia, serif",
                    label: "Georgia",
                  },
                  {
                    id: "Times New Roman, Times, serif",
                    label: "Times New Roman",
                  },
                  {
                    id: "Verdana, Geneva, sans-serif",
                    label: "Verdana",
                  },
                  {
                    id: "Courier New, Courier, monospace",
                    label: "Courier New",
                  },
                  {
                    id: "Lucida Console, Monaco, monospace",
                    label: "Lucida Console",
                  },
                  {
                    id: "Trebuchet MS, Helvetica, sans-serif",
                    label: "Trebuchet MS",
                  },
                  {
                    id: "Impact, Charcoal, sans-serif",
                    label: "Impact",
                  },
                  {
                    id: "Comic Sans MS, cursive, sans-serif",
                    label: "Comic Sans MS",
                  },
                  {
                    id: "Arial Black, Gadget, sans-serif",
                    label: "Arial Black",
                  },
                  {
                    id: "Helvetica Neue, Helvetica, Arial, sans-serif",
                    label: "Helvetica Neue",
                  },
                  {
                    id: "Palatino Linotype, Book Antiqua, Palatino, serif",
                    label: "Palatino Linotype",
                  },
                  {
                    id: "Garamond, serif",
                    label: "Garamond",
                  },
                  {
                    id: "Futura, sans-serif",
                    label: "Futura",
                  },
                  {
                    id: "Tahoma, Geneva, sans-serif",
                    label: "Tahoma",
                  },
                  {
                    id: "Microsoft Sans Serif, Verdana, sans-serif",
                    label: "Microsoft Sans Serif",
                  },
                  {
                    id: "Frank Ruhl, serif",
                    label: "Frank Ruhl",
                  },
                ],
              },
              {
                type: "number",
                label: "Font Size",
                property: "font-size",
                units: ["px", "em", "rem"],
                min: 0,
                default: "16px",
              },
              {
                type: "color",
                label: "Color",
                property: "color",
                default: "#000000",
              },
              {
                type: "select",
                label: "Font Weight",
                property: "font-weight",
                default: "400",
                options: [
                  { id: "100", label: "Thin" },
                  { id: "200", label: "Extra Light" },
                  { id: "300", label: "Light" },
                  { id: "400", label: "Normal" },
                  { id: "500", label: "Medium" },
                  { id: "600", label: "Semi Bold" },
                  { id: "700", label: "Bold" },
                  { id: "800", label: "Extra Bold" },
                  { id: "900", label: "Black" },
                ],
              },
              {
                type: "select",
                label: "Text Align",
                property: "text-align",
                default: "left",
                options: [
                  { id: "left", label: "Left" },
                  { id: "center", label: "Center" },
                  { id: "right", label: "Right" },
                  { id: "justify", label: "Justify" },
                ],
              },
              {
                type: "number",
                label: "Line Height",
                property: "line-height",
                units: ["px", "em", "rem"],
                min: 0,
              },
              {
                type: "number",
                label: "Letter Spacing",
                property: "letter-spacing",
                units: ["px", "em", "rem"],
                min: 0,
              },
            ],
          },
          {
            name: "Decoration",
            open: false,
            buildProps: [
              "background-color",
              "border-style",
              "border-width",
              "border-color",
              "border-radius",
              "box-shadow",
            ],
            properties: [
              {
                type: "color",
                label: "Background Color",
                property: "background-color",
                default: "transparent",
              },
              {
                type: "select",
                label: "Border Style",
                property: "border-style",
                options: [
                  { id: "none", label: "None" },
                  { id: "solid", label: "Solid" },
                  { id: "dashed", label: "Dashed" },
                  { id: "dotted", label: "Dotted" },
                ],
              },
              {
                type: "number",
                label: "Border Width",
                property: "border-width",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "color",
                label: "Border Color",
                property: "border-color",
                default: "#000000",
              },
              {
                type: "number",
                label: "Border Radius",
                property: "border-radius",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "select",
                label: "Box Shadow Type",
                property: "box-shadow-type",
                default: "none",
                options: [
                  { id: "none", label: "None" },
                  { id: "inset", label: "Inset" },
                  { id: "outset", label: "Outset" },
                ],
              },
              {
                type: "number",
                label: "Box Shadow Horizontal",
                property: "box-shadow-h",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "number",
                label: "Box Shadow Vertical",
                property: "box-shadow-v",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "number",
                label: "Box Shadow Blur",
                property: "box-shadow-blur",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "number",
                label: "Box Shadow Spread",
                property: "box-shadow-spread",
                units: ["px"],
                min: 0,
                default: "0",
              },
              {
                type: "color",
                label: "Box Shadow Color",
                property: "box-shadow-color",
                default: "#000000",
              },
            ],
          },
          {
            name: "Extra",
            open: false,
            buildProps: [
              "opacity",
              "z-index",
              "overflow",
              "top",
              "right",
              "bottom",
              "left",
            ],
            properties: [
              {
                type: "number",
                label: "Opacity",
                property: "opacity",
                units: ["%"],
                min: 0,
                max: 100,
                default: "100",
              },
              {
                type: "number",
                label: "Z Index",
                property: "z-index",
                min: 0,
                default: "0",
              },
              {
                type: "select",
                label: "Overflow",
                property: "overflow",
                default: "visible",
                options: [
                  { id: "visible", label: "Visible" },
                  { id: "hidden", label: "Hidden" },
                  { id: "scroll", label: "Scroll" },
                  { id: "auto", label: "Auto" },
                ],
              },
            ],
          },
          {
            name: "Flex",
            open: false,
            properties: [
              {
                type: "select",
                label: "Flex Direction",
                property: "flex-direction",
                default: "row",
                options: [
                  { id: "row", label: "Row" },
                  { id: "row-reverse", label: "Row Reverse" },
                  { id: "column", label: "Column" },
                  { id: "column-reverse", label: "Column Reverse" },
                ],
              },
              {
                type: "select",
                label: "Flex Wrap",
                property: "flex-wrap",
                default: "nowrap",
                options: [
                  { id: "nowrap", label: "No Wrap" },
                  { id: "wrap", label: "Wrap" },
                  { id: "wrap-reverse", label: "Wrap Reverse" },
                ],
              },
              {
                type: "select",
                label: "Justify Content",
                property: "justify-content",
                default: "flex-start",
                options: [
                  { id: "flex-start", label: "Flex Start" },
                  { id: "flex-end", label: "Flex End" },
                  { id: "center", label: "Center" },
                  { id: "space-between", label: "Space Between" },
                  { id: "space-around", label: "Space Around" },
                  { id: "space-evenly", label: "Space Evenly" },
                ],
              },
              {
                type: "select",
                label: "Align Items",
                property: "align-items",
                default: "stretch",
                options: [
                  { id: "stretch", label: "Stretch" },
                  { id: "flex-start", label: "Flex Start" },
                  { id: "flex-end", label: "Flex End" },
                  { id: "center", label: "Center" },
                  { id: "baseline", label: "Baseline" },
                ],
              },
              {
                type: "select",
                label: "Align Content",
                property: "align-content",
                default: "stretch",
                options: [
                  { id: "stretch", label: "Stretch" },
                  { id: "flex-start", label: "Flex Start" },
                  { id: "flex-end", label: "Flex End" },
                  { id: "center", label: "Center" },
                  { id: "space-between", label: "Space Between" },
                  { id: "space-around", label: "Space Around" },
                ],
              },
            ],
          },
        ],
      }:null,
      traitManager:canEdit? {
        appendTo: ".traits-container",
      }:null,
      storageManager: {
        type: "local", // Type of the storage, available: 'local' | 'remote'
        autosave: true, // Store data automatically
        autoload: true, // Autoload stored data on init
        stepsBeforeSave: 1, // If autosave enabled, indicates how many changes are necessary before store method is triggered
        options: {
          local: {
            // Options for the `local` type
            key: "gjsProject", // The key for the local storage
          },
        },
      },
    });

  

    if (editorRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const websiteId = urlParams.get("id");
      const fetchLatestJsonData = async () => {
        if (websiteId != "undefined") {
          editorRef.current.DomComponents.clear();
          try {
            const device_fingerprint = await getClientFingerprint();
            const response = await fetch(
              `${apiUrl}/web-builder/api/get-website-by-id`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-device_fingerprint": device_fingerprint,
                },
                credentials: "include",
                body: JSON.stringify({ id: websiteId }), // Send the 'id' in the body of the request
              }
            );

            const { html_content, css_content } = await response.json();
            editorRef.current.setComponents(html_content);
            // editorRef.current.setStyle(css_content);
            editorRef.current.Commands.add("save-website", {
              run: async (editor) => {
                const htmlContent = editor.getHtml();
                const cssContent = editor.getCss();

                const data = {
                  uuid: websiteId,
                  html_content: htmlContent,
                  css_content: cssContent,
                };

                try {
                  const response = await fetch(
                    `${apiUrl}/web-builder/api/update-website`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(data),
                    }
                  );

                  if (!response.ok) {
                    throw new Error("Failed to update website");
                  }

                  const result = await response.json();
                  setShowToast(true);
                  console.log(result.message);
                } catch (error) {
                  console.error("Error updating website:", error);
                }
              },
            });
          } catch (error) {
            if (axios.isAxiosError(error)) {
              if (error.response && error.response.status === 401) {
                // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                try {
                  const device_fingerprint = await getClientFingerprint();
                  await axios.post(
                    `${apiUrl}/auth/refresh_access_token`,
                    { device_fingerprint: device_fingerprint },
                    { withCredentials: true }
                  );
                  const response = await fetch(
                    `${apiUrl}/web-builder/api/get-website-by-id`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-device_fingerprint": device_fingerprint,
                      },
                      credentials: "include",
                      body: JSON.stringify({ id: websiteId }), // Send the 'id' in the body of the request
                    }
                  );
                  const { html_content, css_content } = await response.json();
                  editorRef.current.setComponents(html_content);
                  editorRef.current.setStyle(css_content);
                  editorRef.current.Commands.add("save-website", {
                    run: async (editor) => {
                      const htmlContent = editor.getHtml();
                      const cssContent = editor.getCss();

                      const data = {
                        uuid: websiteId,
                        html_content: htmlContent,
                        css_content: cssContent,
                      };

                      try {
                        const response = await fetch(
                          `${apiUrl}/web-builder/api/update-website`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(data),
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to update website");
                        }

                        const result = await response.json();
                        setShowToast(true);
                        console.log(result.message);
                      } catch (error) {
                        console.error("Error updating website:", error);
                      }
                    },
                  });
                } catch (error) {
                  await axios.post(
                    `${apiUrl}/auth/logout`,
                    {},
                    { withCredentials: true }
                  );
                  setUser(null);
                  router.push("/login");
                }
              } else {
                await axios.post(
                  `${apiUrl}/auth/logout`,
                  {},
                  { withCredentials: true }
                );
                setUser(null);
                router.push("/login");
              }
            } else {
              console.error("Failed to fetch user:", error);
              await axios.post(
                `${apiUrl}/auth/logout`,
                {},
                { withCredentials: true }
              );
              setUser(null);
              router.push("/login");
            }
          }
        } 

      };

      fetchLatestJsonData();
    }

    // Adding toolbar button configuration



// Define the 'add-html-css-block' command




    editorRef.current.on("stop:fullscreen", () => {
      const blockButton = editorRef.current.Panels.getButton(
        "panel-switcher",
        "show-blocks"
      );
      if (blockButton) {
        blockButton.set("active", true); // Activate the block container
      }
    });

    editorRef.current.on("load", () => {
      const iframe = editorRef.current.Canvas.getFrameEl(); // Access the iframe
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow.document;

      // Inject Bootstrap CSS into iframe head
      const bootstrapCss = iframeDocument.createElement("link");
      bootstrapCss.rel = "stylesheet";
      bootstrapCss.href =
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
      iframeDocument.head.appendChild(bootstrapCss);

      // Inject Bootstrap JS into iframe body (or at the end of body for better performance)
      const bootstrapJs = iframeDocument.createElement("script");
      bootstrapJs.src =
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
      iframeDocument.body.appendChild(bootstrapJs);

      // Optionally you can add jQuery if necessary for Bootstrap's JS functionality
      const jqueryJs = iframeDocument.createElement("script");
      jqueryJs.src = "https://code.jquery.com/jquery-3.6.0.min.js";
      iframeDocument.body.appendChild(jqueryJs);
    });

   

    const previewCommand = editorRef.current.Commands.get("preview");

    editorRef.current.Commands.add("preview", {
      run(editor) {
        // Call the original run function of the preview command
        previewCommand.run(editor);

        // Adjust padding-bottom when in preview mode
        const canvas = document.getElementById("gjs");
        canvas.style.paddingBottom = "0"; // Set padding-bottom to 0 when in preview

        // Keep the button active
        const previewButton = editor.Panels.getButton(
          "panel-switcher",
          "preview"
        );
        if (previewButton) {
          previewButton.set("active", true);
        }
      },
      stop(editor) {
        // Call the original stop function of the preview command
        previewCommand.stop(editor);

        // Restore the original padding-bottom when preview mode is deactivated
        const canvas = document.getElementById("gjs");
        canvas.style.paddingBottom = "15px";

        // Deactivate the preview button directly
        const previewButton = editor.Panels.getButton(
          "panel-switcher",
          "preview"
        );
        if (previewButton) {
          previewButton.set("active", false);
        }
        const blk = editor.Panels.getButton("panel-switcher", "show-blocks");
        if (blk) {
          blk.set("active", true);
        }
      },
    });

    editorRef.current.on("component:add", (model) => {
      console.log("Component added:", model);
      if (model.is("type", "responsive-navbar")) {
        const toggleButton = model.view.el.querySelector("#navbar-toggle");
        const menu = model.view.el.querySelector("#navbar-menu");

        console.log("Toggle Button:", toggleButton);
        console.log("Menu:", menu);

        if (toggleButton && menu) {
          toggleButton.addEventListener("click", () => {
            console.log("Toggle Button Clicked");
            menu.classList.toggle("active");
          });
        }
      }
    });

    const um = editorRef.current.UndoManager;

    // Define the undo command
    editorRef.current.Commands.add("undo", {
      run(editor) {
        if (um.hasUndo()) {
          um.undo();
        }
      },
    });

    editorRef.current.Commands.add("import-code", {
      run(editor) {
          const modal = editor.Modal;
          const container = document.createElement("div");
  
          container.innerHTML = `
              <textarea id="import-area" style="width:100%;height:300px;resize:none;" 
                  placeholder="Paste your HTML/CSS code here..."></textarea>
              <button id="import-btn" style="margin-top:10px;">Import</button>
          `;
  
          modal.setTitle("Import Code");
          modal.setContent(container);
          modal.open();
  
          document.getElementById("import-btn").onclick = () => {
              const code = document.getElementById("import-area").value;
  
              if (code.trim()) {
                  editor.setComponents(code);
              } else {
                  alert("Please enter valid HTML/CSS code.");
              }
  
              modal.close();
          };
      },
  });

  


    // Define the redo command
    editorRef.current.Commands.add("redo", {
      run(editor) {
        if (um.hasRedo()) {
          um.redo();
        }
      },
    });

    // Define the clear-all command
    editorRef.current.Commands.add("clear-all", {
      run(editor) {
        if (confirm("Are you sure you want to clear all content?")) {
          editor.setComponents("");
          editor.setStyle("");
          um.clear();
          const blk = editor.Panels.getButton("panel-switcher", "show-blocks");
          if (blk) {
            blk.set("active", true);
          }
        }
      },
    });

    editorRef.current.Commands.add("set-device-desktop", {
      run: (editor) => editor.setDevice("Desktop"),
    });
    editorRef.current.Commands.add("set-device-mobile", {
      run: (editor) => editor.setDevice("Mobile"),
    });
    editorRef.current.Commands.add("set-device-tablet", {
      run: (editor) => editor.setDevice("Tablet"),
    });
    editorRef.current.Commands.add("show-traits", {
      getTraitsEl(editor) {
        const row = editor.getContainer().closest(".editor-row");
        return row.querySelector(".traits-container");
      },
      run(editor, sender) {
        this.getTraitsEl(editor).style.display = "";
      },
      stop(editor, sender) {
        this.getTraitsEl(editor).style.display = "none";
      },
    });

    editorRef.current.Commands.add("show-layers", {
      getRowEl(editor) {
        return editor.getContainer().closest(".editor-row");
      },
      getLayersEl(row) {
        return row.querySelector(".layers-container");
      },

      run(editor, sender) {
        const lmEl = this.getLayersEl(this.getRowEl(editor));
        lmEl.style.display = "";
      },
      stop(editor, sender) {
        const lmEl = this.getLayersEl(this.getRowEl(editor));
        lmEl.style.display = "none";
      },
    });
    editorRef.current.Commands.add("show-styles", {
      getRowEl(editor) {
        return editor.getContainer().closest(".editor-row");
      },
      getStyleEl(row) {
        return row.querySelector(".styles-container");
      },

      run(editor, sender) {
        const smEl = this.getStyleEl(this.getRowEl(editor));
        smEl.style.display = "";
      },
      stop(editor, sender) {
        const smEl = this.getStyleEl(this.getRowEl(editor));
        smEl.style.display = "none";
      },
    });

    editorRef.current.Commands.add("show-blocks", {
      getRowEl(editor) {
        return editor.getContainer().closest(".editor-row");
      },
      getBlocksEl(row) {
        return row.querySelector(".block-container");
      },

      run(editor, sender) {
        const blocksEl = this.getBlocksEl(this.getRowEl(editor));
        blocksEl.style.display = ""; // Show the blocks container
      },
      stop(editor, sender) {
        const blocksEl = this.getBlocksEl(this.getRowEl(editor));
        blocksEl.style.display = "none"; // Hide the blocks container
      },
    });

    editorRef.current.Panels.addPanel({
      id: "panel-top",
      el: ".panel__top",
    });

    editorRef.current.Panels.addPanel({
      id: "basic-actions",
      el: ".panel__basic-actions",
      buttons: [
        {
          id: "visibility",
          active: true,
          className: "fa fa-square-o",
          command: "sw-visibility",
        },

        {
          id: "preview",
          className: "fa fa-eye",
          command: "preview",
          active: false,
        },
        {
          id: "fullscreen",
          className: "fa fa-arrows-alt",
          command: "fullscreen",
          active: false,
          togglable: true,
        },
        
      ],
    });


  }, []);

  return (
    <div>
      <div className="panel__top">
        <div className="panel__basic-actions"></div>
        <div className="panel__devices"></div>
        <div className="panel__switcher"></div>
      </div>
      <div className="editor-row">
        <div className="editor-canvas">
          <div id="gjs">
            <img src="/info.png" alt="" style={{ width: '1289px', height: '695px' }} />
          </div>
        </div>
        <div className="panel__right">
          <div className="layers-container"></div>
          <div className="styles-container"></div>
          <div className="traits-container"></div>
          <div className="block-container"></div>
        </div>
      </div>
      {showToast && (
        <div className={`toast-notification ${showToast ? 'toast-show' : ''}`}>
          Website saved successfully!
          <button className="toast-close" onClick={handleToastClose}>&times;</button>
        </div>
      )}    </div>
  );
}