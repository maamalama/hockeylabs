import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ColumnResizedEvent,
  ColumnMovedEvent,
  GridReadyEvent,
  IHeaderParams,
  ICellRendererParams,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import OpenAI from "openai";
import { z } from "zod";
// Import shadcn Popover components
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { zodResponseFormat } from "openai/helpers/zod";
import FirecrawlApp, {
  CrawlParams,
  CrawlStatusResponse,
} from "@mendable/firecrawl-js";

// Import Heroicons for icons
import { PlayIcon } from "@heroicons/react/24/outline";

// Type definitions
type CompanyData = {
  name: string;
  website?: string;
  [key: string]: any;
  originalContent?: string;
};

type CompanyDataEvent = {
  companyName: string;
  metric: string;
  value: number;
  description: string;
};

// Original data
const originalData: CompanyData[] = [
  {
    name: "OpenAI",
    website: "https://www.openai.com/",
    originalContent: "This is the original output for Pied Piper.",
    impressions: 249,
    engagements: 88,
    intentScore: 93,
    sessions: 166,
    engagementRate: 26,
    sessionDuration: 59, // Converted to seconds
    conversions: 15,
    bounceRate: 45,
    revenue: 15000,
  },
  {
    name: "Github",
    originalContent: "This is the original output for Hooli.",
    impressions: 500,
    engagements: 200,
    intentScore: 85,
    sessions: 300,
    engagementRate: 40,
    sessionDuration: 120,
    conversions: 50,
    bounceRate: 35,
    revenue: 30000,
  },
  {
    name: "Aviato",
    originalContent: "This is the original output for Aviato.",
    impressions: 150,
    engagements: 70,
    intentScore: 90,
    sessions: 180,
    engagementRate: 46,
    sessionDuration: 80,
    conversions: 25,
    bounceRate: 40,
    revenue: 20000,
  },
  // Add more companies as needed
];

// List of companies
const companies = originalData.map((company) => company.name);

// List of all available metrics (if needed elsewhere)
const allMetrics = [
  "impressions",
  "engagements",
  "intentScore",
  "sessions",
  "engagementRate",
  "conversions",
  "bounceRate",
  "revenue",
];

// List of user acquisition events
const companyEventNames = [
  "Sign Up",
  "Sign In",
  "Purchase",
  "Add to Cart",
  "Checkout",
  "Request Demo",
  "Start Trial",
  "Subscribe",
  "Unsubscribe",
  "Upgrade Plan",
  "Downgrade Plan",
  "Contact Support",
  "Submit Feedback",
  "Refer Friend",
  "Download",
  "Install Extension",
  "Complete Onboarding",
  "Abandon Cart",
  "View Pricing",
  "Visit Landing Page",
];

// Generating synthetic events with counts
const generateCompanyEvents = () => {
  const events: CompanyDataEvent[] = [];

  companies.forEach((company) => {
    for (let i = 0; i < 10; i++) {
      // Randomly select an event name
      const eventName =
        companyEventNames[Math.floor(Math.random() * companyEventNames.length)];

      // Generate a random count for the event
      const count = Math.floor(Math.random() * 20) + 1; // Random count between 1 and 20

      // Create the event description
      const description = `${count} ${eventName}${count > 1 ? "s" : ""}`;

      // Create the event object
      const event: CompanyDataEvent = {
        companyName: company,
        metric: eventName,
        value: count,
        description,
      };

      // Add to the dataset
      events.push(event);
    }
  });

  return events;
};

// Synthetic dataset with updated events
const companyEvents = generateCompanyEvents();

export function ChartShowcase() {
  const [experiments, setExperiments] = useState([
    {
      id: "original",
      name: "Original Data",
      data: originalData,
      insight: "",
    },
  ]);
  const [wrapText, setWrapText] = useState(false);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    {}
  );
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);

  // List of all available metrics
  const allMetrics = [
    "impressions",
    "engagements",
    "intentScore",
    "sessions",
    "engagementRate",
    "conversions",
    "bounceRate",
    "revenue",
  ];

  // State to hold selected metrics
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(allMetrics);

  // Generate options for the multi-select component
  const metricOptions = allMetrics.map((metric) => ({
    value: metric,
    label: metric,
  }));

  // New state for custom prompt input
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Function to apply custom prompt
  const applyCustomPrompt = () => {
    if (!customPrompt) {
      alert("Please enter what you want to improve.");
      return;
    }

    // Parse the custom prompt to identify the metrics to improve
    // For simplicity, we'll assume the user mentions metric names in the prompt
    const lowerCasePrompt = customPrompt.toLowerCase();
    const metricsToImprove = allMetrics.filter((metric) =>
      lowerCasePrompt.includes(metric.toLowerCase())
    );

    const percentageChange = 0.1; // Example: 10% change
    const isIncrease = true; // Assume increase for now

    // Use the latest experiment's data as the base
    const baseData = experiments[experiments.length - 1].data;

    const newData = baseData.map((company) => {
      const newCompany = { ...company };
      metricsToImprove.forEach((metric) => {
        if (typeof company[metric] === "number") {
          const changeAmount = company[metric] * percentageChange;
          newCompany[metric] = isIncrease
            ? company[metric] + changeAmount
            : company[metric] - changeAmount;
        }
      });
      return newCompany;
    });

    const newExperiment = {
      id: `experiment-${experiments.length}`,
      name: `Experiment ${experiments.length}`,
      data: newData,
      insight: customPrompt,
    };

    setExperiments([...experiments, newExperiment]);

    // Reset popover inputs
    setCustomPrompt("");
    setPopoverOpen(false);
  };

  // Prepare data for ag-Grid
  const rowData = useMemo(() => {
    return experiments[0].data.map((company) => {
      const row: any = { name: company.name };

      experiments.forEach((exp) => {
        const expCompany = exp.data.find((c) => c.name === company.name);
        if (expCompany) {
          // For the "Original Data" column, include the entire company data
          row[exp.id] = expCompany;
        } else {
          // If the company is not in this experiment's data, use an empty object
          row[exp.id] = {};
        }
      });

      return row;
    });
  }, [experiments]);

  // Custom Cell Renderer for Original Output
  const OriginalOutputCellRenderer = (props: ICellRendererParams) => {
    const { value } = props; // 'value' is the company data with metrics

    // Check if 'value' is defined
    if (!value) return null;

    // Construct a string with the selected metrics
    const content = selectedMetrics
      .map((metric) => `${metric}: ${value[metric]}`)
      .join(", ");

    return <div className="w-full h-full">{content}</div>;
  };

  const ZActionableInsightResponse = z.object({
    insights: z.array(
      z.object({
        metric: z.string(),
        insight: z.string(),
        increase: z.boolean(),
        value: z.number(),
        percentageChange: z.number(),
        description: z.string(),
        actionSteps: z.array(z.string()), // New field for action steps
        newCompanyEvents: z.array(
          z.object({
            companyName: z.string(),
            metric: z.string(),
            value: z.number(),
            percentageChange: z.number(),
            description: z.string(),
          })
        ),
      })
    ),
  });

  type ActionableInsightResponse = z.infer<typeof ZActionableInsightResponse>;

  const promptForInsights = (
    companyEvents: CompanyDataEvent[],
    improveArea: string,
    companyMetadata: string,
    companyWebsite: string
  ): string => {
    return `
Generate actionable insights for account-based marketing (ABM) data to help specific companies improve targeted metrics. 
You will be provided with company data events, an improvement area prompt, and selected metrics that the company wants to enhance.

# Instructions

- **Analyze Provided Data:** Review the provided company data events and the specified improvement areas.
- **Identify Connections:** Determine how these data events relate to the specific metrics the company aims to improve.
- **Generate Insights:** Develop actionable insights that align with improving the targeted metrics. Consider current industry trends and best practices.
- **Specify Action Steps:** For each insight, list specific steps the company can take to achieve the desired improvements.
- **Modify Data Events:** Suggest modifications to the current company data events to achieve desired improvements in the metrics.

# Output Format

Provide a JSON object with the following structure:

\`\`\`json
{
  "insights": [
    {
      "metric": "string",
      "insight": "string",
      "increase": boolean,
      "value": number,
      "percentageChange": number,
      "description": "string",
      "actionSteps": ["string", "string", ...],
      "newCompanyEvents": [
        {
          "companyName": "string",
          "metric": "string",
          "value": number,
          "percentageChange": number,
          "description": "string"
        },
        ...
      ]
    },
    ...
  ]
}
\`\`\`

# Notes

- Ensure insights are directly applicable and realistic with the company's resources.
- Action steps should be practical and directly related to improving the targeted metric.
- Use the company metadata to provide contextually relevant suggestions.
- Do **not** include any additional text outside of the JSON object.

**Improvement Area Prompt:** ${improveArea}
**Company Data Events:** ${JSON.stringify(companyEvents)}
**Company Metadata:** ${companyMetadata}
**Company Website:** ${companyWebsite}
USE COMPANY METADATA WHICH IS WEBSITE MARKDOWN TO GENERATE PERSONALIZED INSIGHTS FOR EACH COMPANY BASED ON THE WEBSITE TOO. IN THE ACTION STEPS YOU SHOULD MENTION THE COMPANY NAME AND THE WEBSITE URL AND ALSO SOME FEATURES FROM THE INSIGHT.
`;
  };

  // Updated ExperimentCellRenderer function
  function ExperimentCellRenderer(props: ICellRendererParams) {
    const { value, data, colDef } = props;
    const [showPopover, setShowPopover] = useState(false);
    const [cellContent, setCellContent] =
      useState<ActionableInsightResponse | null>(value?.aiResult || null);
    const [isLoading, setIsLoading] = useState(false);

    // Retrieve the experiment ID from the column field
    const experimentId = colDef.field;

    // Find the corresponding experiment from the experiments array
    const experiment = experiments.find((exp) => exp.id === experimentId);
    const app = new FirecrawlApp({
      apiKey: "fc-519d4eb4aace466b8b1d01c9ad56d851",
    });

    // Extract the improveArea from the experiment's insight
    const improveArea = experiment?.insight || "";

    const handleCellClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPopover(true);
    };

    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Use environment variable
      dangerouslyAllowBrowser: true,
    });

    const handleAPICall = async () => {
      setIsLoading(true);

      // Get events for the specific company
      const companyName = data.name;
      const companySpecificEvents = companyEvents.filter(
        (event) => event.companyName === companyName
      );

      const company = experiments[0].data.find(
        (company) => company.name === companyName
      );

      let website = company?.website || "https://github.com/";

      const scrapeResponse = await app.scrapeUrl(website, {
        formats: ["markdown"],
      });
      console.log(scrapeResponse);
      let companyData = "";
      if (!scrapeResponse.success) {
        companyData = "";
      }
      companyData = JSON.stringify(scrapeResponse);

      // Prepare the prompt using the correct improveArea
      const prompt = promptForInsights(
        companySpecificEvents,
        improveArea,
        JSON.stringify(companyData),
        website
      );

      try {
        // Call your OpenAI API function
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // Use the appropriate model
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates insights for account-based marketing (ABM) data.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          // Parse the response using zodResponseFormat
          response_format: zodResponseFormat(
            ZActionableInsightResponse,
            "insights"
          ),
        });
        console.log(response.choices[0].message.content);

        const parseResult = ZActionableInsightResponse.safeParse(
          JSON.parse(response.choices[0].message.content)
        );

        if (!parseResult.success) {
          console.error("Parsing failed:", parseResult.error);
          // Handle parsing error (e.g., show an error message)
        } else {
          const aiResult = parseResult.data;

          setCellContent(aiResult);

          // Update the cell value in the grid data
          const updatedData = { ...data };
          updatedData[colDef.field] = {
            ...value,
            aiResult: aiResult,
          };
          props.node.setData(updatedData);
        }
      } catch (error) {
        console.error("API call failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      // If we have value.aiResult, set cellContent
      if (value?.aiResult && !cellContent) {
        setCellContent(value.aiResult);
      }
    }, [value, cellContent]);

    const displayContent = useMemo(() => {
      if (
        cellContent &&
        Array.isArray(cellContent.insights) &&
        cellContent.insights.length > 0
      ) {
        const insight = cellContent.insights[0];
        const changeDirection = insight.increase ? "↑" : "↓";
        const percentage = `${Math.abs(insight.percentageChange)}%`;

        // Get original value for the metric
        const originalDataEntry = experiments[0].data.find(
          (company) => company.name === data.name
        );
        const originalValue = originalDataEntry
          ? originalDataEntry[insight.metric]
          : null;

        if (originalValue != null) {
          const deltaValue = insight.value - originalValue;
          const deltaValueFormatted =
            deltaValue > 0 ? `+${deltaValue}` : `${deltaValue}`;

          return `${insight.metric}: ${changeDirection} ${deltaValueFormatted} (${percentage})`;
        } else {
          return `${insight.metric}: ${changeDirection} (${percentage})`;
        }
      } else if (isLoading) {
        return <div className="animate-pulse text-gray-500">Loading...</div>;
      } else {
        return (
          <Button variant="ghost" size="sm" onClick={handleAPICall}>
            <PlayIcon className="w-4 h-4" />
          </Button>
        );
      }
    }, [cellContent, isLoading, experiments, data.name]);

    // Extract the first insight and first recommended action
    const insight = cellContent?.insights?.[0] || null;
    const recommendedAction = insight?.newCompanyEvents?.[0] || null;
    const newCompanyEvents = insight?.newCompanyEvents || null;

    // Get original events for the company
    const originalCompanyEvents = companyEvents.filter(
      (event) => event.companyName === data.name
    );

    // Function to compare original and new events
    const compareEvents = () => {
      if (!newCompanyEvents || !originalCompanyEvents) return [];

      // For simplicity, use metric as the key to compare events
      const originalEventsMap = originalCompanyEvents.reduce((acc, event) => {
        acc[event.metric] = event;
        return acc;
      }, {} as { [key: string]: CompanyDataEvent });

      return newCompanyEvents.map((newEvent) => {
        const originalEvent = originalEventsMap[newEvent.metric];
        return {
          metric: newEvent.metric,
          originalDescription: originalEvent
            ? originalEvent.description
            : "N/A",
          originalValue: originalEvent ? originalEvent.value : "N/A",
          newDescription: newEvent.description,
          newValue: newEvent.value,
          difference:
            newEvent.percentageChange - (originalEvent?.percentageChange || 0),
        };
      });
    };

    // Get the compared events
    const comparedEvents = compareEvents();

    return (
      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <PopoverTrigger asChild>
          <div
            className="w-full h-full flex items-center cursor-pointer"
            onClick={handleCellClick}
          >
            <div>{displayContent}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4">
          <div className="flex flex-col space-y-4">
            {insight ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {insight.metric}:{" "}
                  <span
                    className={`${
                      insight.increase ? "text-green-600" : "text-red-600"
                    } font-bold`}
                  >
                    {insight.increase ? "↑" : "↓"}{" "}
                    {Math.abs(insight.percentageChange)}%
                  </span>
                </h3>
                <p>{insight.description}</p>
                {insight.actionSteps && insight.actionSteps.length > 0 && (
                  <>
                    <h4 className="font-semibold">Action Steps:</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      {insight.actionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </>
                )}
                {/* Display comparison of original and new events */}
                {comparedEvents.length > 0 && (
                  <>
                    <h4 className="font-semibold">Event Changes:</h4>
                    <ul>
                      {comparedEvents.map((event, idx) => (
                        <li key={idx} className="mb-2">
                          <strong>{event.metric}</strong>
                          <div>
                            <span className="text-sm text-gray-600">
                              Original:
                            </span>{" "}
                            {event.originalValue}
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">New:</span>{" "}
                            {event.newValue}
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">
                              Difference:
                            </span>{" "}
                            {event.difference.toFixed(2)}%
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : isLoading ? (
              <div className="animate-pulse text-gray-500">
                Generating insights...
              </div>
            ) : (
              <div>
                <Label>Generate Insights</Label>
                <p>
                  Do you want to generate insights for{" "}
                  <strong>{data.name}</strong> in{" "}
                  <strong>{colDef.headerName}</strong>?
                </p>
                <Button onClick={handleAPICall}>Generate Insights</Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const CompanyEventsCellRenderer = (props: ICellRendererParams) => {
    const { value } = props;
    const companyEventss = companyEvents.filter(
      (event) => event.companyName === value
    );
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>
            <div>{value}</div>
          </PopoverTrigger>
          <PopoverContent>
            <Card>
              <CardHeader>
                <CardTitle>{value}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul>
                  {companyEventss.map((event, idx) => (
                    <li key={idx}>{event.description}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </>
    );
  };

  // Custom Header Component
  const CustomHeaderComponent = (props: IHeaderParams) => {
    const [showPopover, setShowPopover] = useState(false);

    const exp = experiments.find((e) => e.id === props.column.getColId());

    const handleHeaderClick = () => {
      // Only open popover if it's not the original column
      if (props?.column?.getColId() === "original") return;
      setShowPopover(!showPopover);
    };

    const CompanyEventsCellRenderer = (props: ICellRendererParams) => {
      const { value } = props;
      const companyEvents = companyEvents.filter(
        (event) => event.companyName === value
      );
      return <div>{companyEvents.length}</div>;
    };

    return (
      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <PopoverTrigger asChild>
          <div
            className="flex items-center justify-between w-full h-full pl-2 cursor-pointer"
            onClick={handleHeaderClick}
          >
            <div className="flex items-center space-x-2">
              <span className="text-md font-semibold text-slate-900">
                {props.displayName}
              </span>
              {exp && exp.id !== "original" && (
                <Badge
                  variant="default"
                  className="text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md font-medium hover:bg-slate-100"
                >
                  Output
                </Badge>
              )}
            </div>
          </div>
        </PopoverTrigger>
        {exp && exp.id !== "original" && (
          <PopoverContent className="w-[400px] p-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">{exp.name}</h2>
              <p>{exp.insight}</p>
            </div>
          </PopoverContent>
        )}
      </Popover>
    );
  };

  // Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    let columns: ColDef[] = [
      {
        headerName: "Company",
        field: "name",
        pinned: "left",
        width: 200,
        headerComponent: CustomHeaderComponent,
        cellRenderer: CompanyEventsCellRenderer,
        wrapText: true,
        cellClass: "border-r border-[#E2E8F0]",
        headerClass: "border-r border-[#E2E8F0]",
      },
    ];

    experiments.forEach((exp) => {
      // Use different cell renderer for "Original Data"
      let cellRenderer = ExperimentCellRenderer;
      let cellRendererParams = {};
      if (exp.id === "original") {
        cellRenderer = OriginalOutputCellRenderer;
        cellRendererParams = { selectedMetrics }; // Pass 'selectedMetrics' if needed
      }

      columns.push({
        headerName: exp.name,
        field: exp.id,
        width: 300,
        headerComponent: CustomHeaderComponent,
        cellRenderer: cellRenderer,
        cellRendererParams: cellRendererParams,
        cellClass: "border-r border-[#E2E8F0]",
        headerClass: "border-r border-[#E2E8F0]",
      });
    });

    // Adjust column widths
    columns.forEach((col: ColDef) => {
      if (col.field && columnWidths[col.field]) {
        col.width = columnWidths[col.field];
      }
    });

    // Apply column order
    if (columnOrder.length > 0) {
      columns.sort(
        (a, b) => columnOrder.indexOf(a.field!) - columnOrder.indexOf(b.field!)
      );
    }

    return columns;
  }, [experiments, columnWidths, columnOrder, selectedMetrics]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      autoHeight: true, // Adjust row height to fit content
      cellStyle: {
        whiteSpace: "normal", // Allow text to wrap
      },
      // Add cellClass and headerClass to apply borders
      cellClass: "border-r border-[#E2E8F0]",
      headerClass: "border-r border-[#E2E8F0]",
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const onColumnResized = useCallback((params: ColumnResizedEvent) => {
    if (params.column) {
      const colId = params.column.getId();
      const newWidth = params.column.getActualWidth();
      setColumnWidths((prev) => ({ ...prev, [colId]: newWidth }));
    }
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridApi) {
      const allCols = gridApi.getColumnDefs();
      const colOrder = allCols?.map((col) => col.field!) || [];
      setColumnOrder(colOrder);
    }
  }, [gridApi]);

  // Group events by company for display
  const eventsByCompany = useMemo(() => {
    const groupedEvents: { [key: string]: CompanyDataEvent[] } = {};
    companies.forEach((company) => {
      groupedEvents[company] = companyEvents.filter(
        (event) => event.companyName === company
      );
    });
    return groupedEvents;
  }, [companies, companyEvents]);

  // Function to prepare data for LLM
  const prepareDataForLLM = () => {
    const formattedData = companyEvents.map((event) => ({
      company: event.companyName,
      metric: event.metric,
      value: event.value,
      description: event.description,
    }));
    return formattedData;
  };

  // Use the function as needed
  const dataForLLM = prepareDataForLLM();
  // Pass dataForLLM to your LLM processing function when appropriate

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
          <CardDescription>
            Compare original data with experiment results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setWrapText(!wrapText)}>
                {wrapText ? "Disable" : "Enable"} Wrap Text
              </Button>
            </div>
            <div>
              {/* Popover for Add Experiment */}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button className="mr-2">Add Experiment</Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4">
                  <div className="flex flex-col space-y-4">
                    <div>
                      <Label htmlFor="prompt">
                        What do you want to improve?
                      </Label>
                      <Textarea
                        id="prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Enter your improvement goals..."
                      />
                    </div>
                    <Button onClick={applyCustomPrompt}>Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div
            className="ag-theme-alpine w-full"
            style={{ height: 400, width: "100%" }}
          >
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              onColumnResized={onColumnResized}
              onColumnMoved={onColumnMoved}
              suppressRowTransform={true}
              animateRows={true}
              rowHeight={wrapText ? undefined : 80}
            />
          </div>
        </CardContent>
      </Card>

      {experiments.slice(1).map((exp) => (
        <Card key={exp.id} className="mb-4">
          <CardHeader>
            <CardTitle>{exp.name} - Improvement Prompt</CardTitle>
          </CardHeader>
          <CardContent>{exp.insight}</CardContent>
        </Card>
      ))}

      {/* Display Company Events */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Company Events</CardTitle>
          <CardDescription>
            Click on a company name to view their events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.map((company) => (
            <div key={company} className="mb-6">
              <Popover>
                <PopoverTrigger asChild>
                  <h3 className="text-lg font-semibold mb-2 cursor-pointer">
                    {company}
                  </h3>
                </PopoverTrigger>
                <PopoverContent className="w-96 max-h-96 overflow-y-auto p-4">
                  <ul className="list-disc pl-5">
                    {eventsByCompany[company].map((event, index) => (
                      <li key={index} className="mb-2">
                        {event.description}
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
