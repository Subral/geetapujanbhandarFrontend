import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, User as UserIcon, Trash2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import AuthDialog from './AuthDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StarRow = ({ rating, size = 'h-4 w-4', onSelect = null }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${onSelect ? 'cursor-pointer' : ''}`}
          style={{
            fill: n <= rating ? '#D4AF37' : 'none',
            color: n <= rating ? '#D4AF37' : '#D9CBB8'
          }}
          onClick={onSelect ? () => onSelect(n) : undefined}
        />
      ))}
    </div>
  );
};

const ProductReviews = ({ productId, user }) => {
  const [data, setData] = useState({ reviews: [], average_rating: 0, total_reviews: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myImages, setMyImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/products/${productId}/reviews`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteReview = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (myImages.length >= 3) {
      toast.error('Maximum 3 photos per review');
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/upload-image`, formData);
      setMyImages([...myImages, res.data.url]);
    } catch (error) {
      toast.error('Photo upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const submitReview = async () => {
    if (myRating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/products/${productId}/reviews`,
        { rating: myRating, comment: myComment.trim(), images: myImages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Thanks for your review!');
      setShowForm(false);
      setMyRating(0);
      setMyComment('');
      setMyImages([]);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/products/${productId}/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Review removed');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return null;
  }

  const { reviews, average_rating, total_reviews, distribution } = data;

  return (
    <div className="mt-10 md:mt-16 pt-8 border-t border-[#E6D5C3]">
      <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6" style={{ fontFamily: 'Playfair Display' }}>
        Customer Reviews
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Summary */}
        <div className="md:col-span-1 flex flex-col items-center justify-center p-4 md:p-6 rounded-xl md:rounded-2xl" style={{ background: '#F5E6D3' }}>
          <p className="text-3xl md:text-5xl font-bold" style={{ color: '#E53935' }}>{average_rating || '0.0'}</p>
          <StarRow rating={Math.round(average_rating)} size="h-4 w-4 md:h-5 md:w-5" />
          <p className="text-xs md:text-sm text-[#8C7E76] mt-1">
            {total_reviews} review{total_reviews !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Distribution */}
        <div className="md:col-span-2 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution?.[String(star)] || 0;
            const pct = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs md:text-sm">
                <span className="w-8 text-[#8C7E76]">{star}★</span>
                <div className="flex-1 h-2 rounded-full bg-[#F0E4D4] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#D4AF37' }} />
                </div>
                <span className="w-6 text-right text-[#8C7E76]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write a review */}
      {!showForm ? (
        <Button
          variant="outline"
          onClick={handleWriteReview}
          className="mb-6 rounded-full border-[#E53935]"
          style={{ color: '#E53935' }}
          data-testid="write-review-button"
        >
          Write a Review
        </Button>
      ) : (
        <div className="mb-8 p-4 md:p-6 border border-[#E6D5C3] rounded-xl md:rounded-2xl space-y-3">
          <p className="text-sm font-medium">Your rating</p>
          <StarRow rating={myRating} size="h-6 w-6" onSelect={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Share your experience with this product (optional)"
            className="w-full px-3 py-2 text-sm border border-[#E6D5C3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935] resize-none"
            rows={3}
            data-testid="review-comment-input"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {myImages.map((img, i) => (
              <div key={img} className="relative">
                <img loading="lazy" src={img} alt={`Review upload ${i + 1}`} className="w-14 h-14 rounded-lg object-cover border border-[#E6D5C3]" />
                <button
                  onClick={() => setMyImages(myImages.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#E53935] flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            ))}
            {myImages.length < 3 && (
              <label className="w-14 h-14 rounded-lg border-2 border-dashed border-[#E6D5C3] flex flex-col items-center justify-center cursor-pointer hover:border-[#E53935] transition-colors">
                <Camera className="h-4 w-4" style={{ color: '#8C7E76' }} />
                <span className="text-[8px] text-[#8C7E76]">{uploadingImage ? '...' : 'Photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} data-testid="review-photo-input" />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={submitReview}
              disabled={submitting}
              className="rounded-full px-6"
              style={{ background: '#E53935' }}
              data-testid="submit-review-button"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-[#8C7E76]">No reviews yet. Be the first to share your experience!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-[#E6D5C3] rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F5E6D3' }}>
                    <UserIcon className="h-4 w-4" style={{ color: '#8C7E76' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.user_name}</p>
                    <p className="text-xs text-[#8C7E76]">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {user && (user.id === r.user_id || user.role === 'admin') && (
                  <button onClick={() => deleteReview(r.id)} data-testid={`delete-review-${r.id}`}>
                    <Trash2 className="h-4 w-4" style={{ color: '#8C7E76' }} />
                  </button>
                )}
              </div>
              <div className="mt-2">
                <StarRow rating={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.comment && <p className="text-sm text-[#4A3B32] mt-2 leading-relaxed">{r.comment}</p>}
              {r.images && r.images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {r.images.map((img) => (
                    <a key={img} href={img} target="_blank" rel="noopener noreferrer">
                      <img loading="lazy" src={img} alt="Customer photo" className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border border-[#E6D5C3] hover:opacity-90" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAuth && <AuthDialog open={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export { StarRow };
export default ProductReviews;
