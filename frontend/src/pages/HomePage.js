import { useState, useCallback } from "react";
import axios from "axios";
import { Upload, Sparkles, Image as ImageIcon, ArrowRight, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedPhotoId, setUploadedPhotoId] = useState(null);
  const [personalizedImage, setPersonalizedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPersonalizedImage(null);
    setUploadedPhotoId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a photo first");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadedPhotoId(response.data.id);
      toast.success("Photo uploaded successfully!", {
        description: response.data.has_face ? "Face detected ✓" : "Ready to transform"
      });
      
      // Auto-generate after upload
      handleGenerate(response.data.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed", {
        description: error.response?.data?.detail || "Please try again"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async (photoId = uploadedPhotoId) => {
    if (!photoId) {
      toast.error("Please upload a photo first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post(`${API}/generate`, {
        photo_id: photoId,
        prompt: "Transform this child into a whimsical illustrated character with big expressive eyes, soft features, wearing a floral dress with a pink flower headband, in a cute cartoon style with pastel colors and a warm, playful atmosphere"
      });
      
      setPersonalizedImage(response.data);
      toast.success("Magic complete! ✨", {
        description: "Your personalized illustration is ready"
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Generation failed", {
        description: error.response?.data?.detail || "Please try again"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!personalizedImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${personalizedImage.personalized_image}`;
    link.download = `personalized-${personalizedImage.id}.png`;
    link.click();
    toast.success("Downloaded!");
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedPhotoId(null);
    setPersonalizedImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E1B4B]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              Magic Portrait
            </h1>
          </div>
          <Button 
            data-testid="gallery-nav-button"
            onClick={() => navigate('/gallery')} 
            variant="outline" 
            className="rounded-full"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Gallery
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 fade-in">
          <h2 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1E1B4B] mb-6 tracking-tight leading-tight"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            Transform Photos into
            <span className="block mt-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              Whimsical Art
            </span>
          </h2>
          <p className="text-base md:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
            Upload a child's photo and watch as AI creates a magical illustrated character
          </p>
        </div>

        {/* Upload Section */}
        {!previewUrl ? (
          <Card 
            data-testid="upload-zone"
            className={`max-w-2xl mx-auto card-hover upload-zone border-2 border-dashed ${
              dragOver ? 'drag-over border-violet-500' : 'border-[#E2E8F0]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 flex items-center justify-center">
                <Upload className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-xl font-semibold text-[#1E1B4B] mb-3" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                Upload Your Photo
              </h3>
              <p className="text-[#64748B] mb-6">
                Drag & drop or click to select a child's photo
              </p>
              <input
                data-testid="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button 
                  data-testid="select-photo-button"
                  className="magic-button text-white rounded-full px-8 py-6 text-lg font-semibold" 
                  as="span"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Select Photo
                </Button>
              </label>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Comparison View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Original Photo */}
              <Card className="card-hover rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <div className="aspect-square relative bg-gradient-to-br from-violet-50 to-white">
                    <img 
                      data-testid="preview-image"
                      src={previewUrl} 
                      alt="Original" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2">
                      <span className="text-sm font-semibold text-[#1E1B4B]">Original</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Result */}
              <Card className="card-hover rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <div className="aspect-square relative bg-gradient-to-br from-fuchsia-50 to-white flex items-center justify-center">
                    {isGenerating ? (
                      <div className="text-center">
                        <div className="loading-spinner mx-auto mb-4"></div>
                        <p className="text-[#64748B] font-medium">Creating magic...</p>
                      </div>
                    ) : personalizedImage ? (
                      <>
                        <img 
                          data-testid="personalized-image"
                          src={`data:image/png;base64,${personalizedImage.personalized_image}`}
                          alt="Personalized" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2">
                          <span className="text-sm font-semibold text-[#1E1B4B] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500 sparkle" />
                            Personalized
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center px-6">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 text-violet-500" />
                        <p className="text-[#64748B]">Your magical illustration will appear here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              {!uploadedPhotoId && (
                <Button 
                  data-testid="transform-button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="magic-button text-white rounded-full px-8 py-6 text-lg font-semibold"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Transform Now
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              )}
              
              {personalizedImage && (
                <>
                  <Button 
                    data-testid="download-button"
                    onClick={handleDownload}
                    variant="outline"
                    className="rounded-full px-8 py-6 text-lg font-semibold border-2"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download
                  </Button>
                  <Button 
                    data-testid="regenerate-button"
                    onClick={() => handleGenerate()}
                    variant="outline"
                    className="rounded-full px-8 py-6 text-lg font-semibold border-2"
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </>
              )}
              
              <Button 
                data-testid="reset-button"
                onClick={handleReset}
                variant="ghost"
                className="rounded-full px-8 py-6 text-lg"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Template Reference */}
        <div className="mt-20 text-center">
          <p className="text-sm text-[#64748B] mb-6">Reference Template Style</p>
          <Card className="max-w-sm mx-auto rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-0">
              <img 
                src="https://customer-assets.emergentagent.com/job_a6d7b4a0-4d66-403d-9f7b-03e1f550f6a5/artifacts/ojnapsq2_piclumen-1744033346326.png"
                alt="Template Reference"
                className="w-full h-auto"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
