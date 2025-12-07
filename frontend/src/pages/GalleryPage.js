import { useState, useEffect } from "react";
import axios from "axios";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GalleryPage = () => {
  const navigate = useNavigate();
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const response = await axios.get(`${API}/gallery`);
      setGallery(response.data);
    } catch (error) {
      console.error('Gallery fetch error:', error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (image) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${image.personalized_image}`;
    link.download = `personalized-${image.id}.png`;
    link.click();
    toast.success("Downloaded!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button 
            data-testid="back-button"
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E1B4B]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              Gallery
            </h1>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      {/* Gallery Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-12">
          <h2 
            className="text-4xl sm:text-5xl font-bold text-[#1E1B4B] mb-4 tracking-tight"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            Your Magical Creations
          </h2>
          <p className="text-base md:text-lg text-[#64748B]">
            {gallery.length} personalized illustration{gallery.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-[#64748B]">Loading gallery...</p>
          </div>
        ) : gallery.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-violet-300" />
            <p className="text-[#64748B] text-lg mb-6">No creations yet</p>
            <Button 
              data-testid="create-first-button"
              onClick={() => navigate('/')} 
              className="magic-button text-white rounded-full px-8 py-6"
            >
              Create Your First
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-grid">
            {gallery.map((image, index) => (
              <Card key={image.id} className="card-hover rounded-2xl overflow-hidden shadow-sm fade-in" data-testid={`gallery-item-${index}`}>
                <CardContent className="p-0">
                  <div className="aspect-square relative bg-gradient-to-br from-violet-50 to-white">
                    <img 
                      src={`data:image/png;base64,${image.personalized_image}`}
                      alt="Personalized"
                      className="w-full h-full object-cover"
                      data-testid={`gallery-image-${index}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <Button 
                        data-testid={`download-button-${index}`}
                        onClick={() => handleDownload(image)}
                        size="sm"
                        className="magic-button text-white rounded-full w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-xs text-[#64748B]">
                      {new Date(image.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GalleryPage;
