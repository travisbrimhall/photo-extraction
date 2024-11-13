import React, { useState, useEffect } from 'react';
import { anthropic, openai } from './config/api';
import './App.css';

function App() {
  const [imageJobs, setImageJobs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load images from public directory on mount
  useEffect(() => {
    loadImagesFromPublic();
  }, []);

  const loadImagesFromPublic = async () => {
    try {
      const imageFiles = [
        'image_0.jpeg',
        'image_1.jpeg',
        'image_2.jpeg',
        'image_3.jpeg',
        'image_4.jpeg',
        'image_5.jpeg',
        'image_6.jpeg',
        'image_7.jpeg',
        'image_8.jpeg',
        'image_9.jpeg',
        'image_10.jpeg',
        'image_11.jpeg',
        'image_12.jpeg',
        'image_13.jpeg',
        'image_14.jpeg',
        'image_15.jpeg',
        'image_16.jpeg',
        'image_17.jpeg',
        'image_18.jpeg',
        'image_19.jpeg',
        'image_20.jpeg',
        'image_21.jpeg',
        'image_22.jpeg',
        'image_23.jpeg',
        'image_24.jpeg',
        'image_25.jpeg',
        'image_26.jpeg',
        'image_27.jpeg',
        'image_28.jpeg',
        'image_29.jpeg',
        'image_30.jpeg',
        'image_31.jpeg',
        'image_32.jpeg',
      ];

      const jobs = imageFiles.map(filename => ({
        id: crypto.randomUUID(),
        filename,
        path: `/images/${filename}`,
        status: 'pending',
        response: null,
        error: null
      }));

      setImageJobs(jobs);
      setProgress({ current: 0, total: jobs.length });
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const processImage = async (job) => {
    const { filename, path: imagePath } = job;
    debugger;
    try {
      // Convert image to base64
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Prepare the message for OpenAI
      const message = {
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `
              These Are Your Instructions:

              You are a helpful assistant that is tasked with extracting numbers from an image. 

              The image is a whiteboard, so it has a white background, and the text is hand-written on it.
              Some of the text is a bit messy, but you should be able to make sense of it. It was mostly written by middle aged men.
              Typically the headings are in color, and the content is black, but there could be some exceptions to this.

              This is chemical data, related to an above ground storage tank that is in use by a water company supporting oil and gas extraction in the united states.

              State that the goal is to detect and extract all numbers and headings from the image, and maintain the format/structure of the data.

              Although there are exceptions to these values, this range guide should be used to help understand if you are reading correctly:
              The first row, ORP, is generally between 200 and 600.
              PH (typically one digit with a decimal) is generally between 2 and 9.
              Turb is generally between 0 and 70.
              Iron (typically one digit with a decimal) is generally between 0 and 10.
              TDS is generally between 0 and 70.

              If a number is partially obscured or ambiguous, please flag it rather than guessing, to avoid inaccuracies.

              Please note any uncertain extractions or potential errors for further review.
              
              You need to extract the DATE of the reading. If you can't find a date, please note the date as "None".
              You need to extract the NAME of the pond. If you can't find a name, please note the name as "None".

              The only output will be a single csv file, and it will include the headings: Collect Date,	Pond Name,	ORP,	PH,	Iron,	Turbidity,	TDS, Image Name, and no other data.

              The output that you generate should be in csv format, and include information for the following headers, in this order:
              Collect Date,	Pond Name,	ORP,	PH,	Iron,	Turbidity,	TDS, Image Name

              Note on Collection Date:
              You will find in the images that for each date, there are entries for many times, taken at two hour intervals.
              When creating the "collection date" it should therefore be in the format of "MM/DD/YYYY H:MM A"

              Note on Image Name:
              The image name is ${filename}.

              Please do not include any other text in your response.
              `
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image.split(',')[1]}`
              }
            }
          ]
        }]
      };

      const result = await openai.chat.completions.create(message);
      const gptResponse = result.choices[0].message.content;
      console.log({ gptResponse });
      return gptResponse;

    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);

    try {
      // Process all images sequentially
      for (let i = 0; i < imageJobs.length; i++) {
        const job = imageJobs[i];
        console.log({ job })
        setProgress({ current: i + 1, total: imageJobs.length });
        setImageJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'processing' } : j
        ));

        const response = await processImage(job);
        console.log(`Response for image ${i}:`, response);
        debugger;

        setImageJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'completed', response } : j
        ));
      }

    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToCSV = () => {
    // Filter only completed jobs
    const completedJobs = imageJobs.filter(job => job.status === 'completed');

    // Clean up the responses by removing markdown code block syntax
    const cleanResponses = completedJobs.map(job => {
      return job.response
        .replace(/```csv\n/, '')  // Remove opening ```csv
        .replace(/```$/, '')      // Remove closing ```
        .trim();
    });

    // Combine all responses, but only include headers once
    const [firstResponse, ...restResponses] = cleanResponses;
    const csvLines = firstResponse.split('\n');
    const headers = csvLines[0];
    const dataLines = [
      headers,
      ...csvLines.slice(1),                // Data from first response
      ...restResponses.flatMap(response => // Data from remaining responses
        response.split('\n').slice(1)      // Skip headers from other responses
      )
    ];

    // Changed this line from csvLines to dataLines
    const csvContent = dataLines.join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'water_analysis_results.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Image Processor</h1>

        <button
          onClick={processQueue}
          disabled={isProcessing || imageJobs.length === 0}
        >
          {isProcessing ? `Processing ${progress.current}/${progress.total}...` : 'Process Images'}
        </button>

        <button
          onClick={saveToCSV}
          disabled={!imageJobs.some(job => job.status === 'completed')}
        >
          Download Results
        </button>
      </header>
    </div>
  );
}

export default App;
