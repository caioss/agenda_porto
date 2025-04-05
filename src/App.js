import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import apiData from "./request";
import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [related, setRelated] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  // Replace state with ref to avoid re-renders
  const scrollPositionRef = useRef(0);

  // Simplified effect that only depends on selectedItem
  useEffect(() => {
    // Function to handle body scroll locking
    const handleBodyScroll = () => {
      if (selectedItem) {
        // Save the current scroll position
        scrollPositionRef.current = window.scrollY;

        // Calculate scrollbar width to prevent content shift
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${scrollBarWidth}px`;

        // Lock the body in place
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPositionRef.current}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body styles first
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Then restore scroll position if we have one
        if (scrollPositionRef.current > 0) {
          window.scrollTo(0, scrollPositionRef.current);
        }
      }
    };

    // Call the handler immediately when selectedItem changes
    handleBodyScroll();

    // Clean up function
    return () => {
      // Only restore scroll if modal was open when unmounting
      if (selectedItem) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        if (scrollPositionRef.current > 0) {
          window.scrollTo(0, scrollPositionRef.current);
        }
      }
    };
  }, [selectedItem]); // Only run when selectedItem changes

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("https://repeater.bondlayer.com/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        setItems(data.items || []);
        setRelated(data.related || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date for Google Calendar URL
  const formatGoogleCalendarDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  // Generate Google Calendar URL
  const generateGoogleCalendarUrl = (item) => {
    if (!item) return "";

    const startDate = formatGoogleCalendarDate(item.datetime_start_date);
    const endDate = formatGoogleCalendarDate(item.datetime_end_date);
    const title = encodeURIComponent(
      item.text_display_title?.all
        ? decodeHtml(item.text_display_title.all)
        : ""
    );

    // Get location information if available
    let location = "";
    if (item.ref_local && related[item.ref_local]) {
      const locationObj = related[item.ref_local];
      const locationName = locationObj._title?.all
        ? decodeHtml(locationObj._title.all)
        : "";
      const locationAddress = locationObj.text_morada?.all || "";

      if (locationName && locationAddress) {
        location = encodeURIComponent(`${locationName}, ${locationAddress}`);
      } else if (locationName) {
        location = encodeURIComponent(locationName);
      } else if (locationAddress) {
        location = encodeURIComponent(locationAddress);
      }
    }

    // Get description (remove HTML tags for Google Calendar)
    const description = encodeURIComponent(
      item.text_sinopse?.all
        ? DOMPurify.sanitize(item.text_sinopse.all, { ALLOWED_TAGS: [] }).trim()
        : ""
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${location}`;
  };

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const decodeHtml = (html) => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = html;
    return textArea.value;
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
  };

  // Create a sanitized HTML component
  const SanitizedHTML = ({ html, className }) => {
    if (!html) return null;
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    );
  };

  return (
    <div className="App">
      <h1>Agenda Porto</h1>

      {loading ? (
        <div className="loading">Carregando eventos...</div>
      ) : error ? (
        <div className="error">Erro: {error}</div>
      ) : (
        <div className="card-container">
          {items.map((item) => (
            <div
              key={item.id}
              className="card"
              onClick={() => handleCardClick(item)}
            >
              <div className="card-image">
                <img
                  src={item.image_image?.all}
                  alt={
                    item.text_display_title?.all
                      ? decodeHtml(item.text_display_title.all)
                      : ""
                  }
                />
              </div>
              <div className="card-content">
                <h3>
                  {item.text_display_title?.all
                    ? decodeHtml(item.text_display_title.all)
                    : ""}
                </h3>

                {item.ref_seccao && related[item.ref_seccao] && (
                  <span className="category">
                    {related[item.ref_seccao]._title?.all}
                  </span>
                )}

                <div className="date-info">
                  <p>
                    <strong>Data:</strong>{" "}
                    {formatDateTime(item.datetime_start_date)}
                  </p>
                  {!isSameDay(
                    item.datetime_start_date,
                    item.datetime_end_date
                  ) && (
                    <p>
                      <strong>Até:</strong>{" "}
                      {formatDateTime(item.datetime_end_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="popover-overlay" onClick={() => setSelectedItem(null)}>
          <div className="popover-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedItem(null)}>
              ×
            </button>

            {/* Event image */}
            <div className="popover-image">
              <img
                src={selectedItem.image_image?.all}
                alt={
                  selectedItem.text_display_title?.all
                    ? decodeHtml(selectedItem.text_display_title.all)
                    : ""
                }
              />
            </div>

            {/* Event title */}
            <h2>
              {selectedItem.text_display_title?.all
                ? decodeHtml(selectedItem.text_display_title.all)
                : ""}
            </h2>

            {/* Date info with Google Calendar button */}
            <div className="popover-date-actions">
              <div className="popover-dates">
                <p>
                  <strong>Início:</strong>{" "}
                  {formatDateTime(selectedItem.datetime_start_date)}
                </p>
                {!isSameDay(
                  selectedItem.datetime_start_date,
                  selectedItem.datetime_end_date
                ) && (
                  <p>
                    <strong>Fim:</strong>{" "}
                    {formatDateTime(selectedItem.datetime_end_date)}
                  </p>
                )}
              </div>
              <a
                href={generateGoogleCalendarUrl(selectedItem)}
                target="_blank"
                rel="noopener noreferrer"
                className="calendar-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Adicionar ao Google Calendar
              </a>
            </div>

            {/* Event description */}
            <SanitizedHTML
              html={selectedItem.text_sinopse?.all}
              className="description"
            />

            {/* Location information */}
            {selectedItem.ref_local &&
              related[selectedItem.ref_local] &&
              (() => {
                // Extract location object once to avoid repetitive lookups
                const locationObj = related[selectedItem.ref_local];

                return (
                  <div className="location-info">
                    <h3>Localização</h3>
                    <div className="location-container">
                      {locationObj.image_image?.all && (
                        <div className="location-image">
                          <img
                            src={locationObj.image_image.all}
                            alt={
                              locationObj._title?.all
                                ? decodeHtml(locationObj._title.all)
                                : "Location"
                            }
                          />
                        </div>
                      )}
                      <div className="location-details">
                        <h4>
                          {locationObj._title?.all
                            ? decodeHtml(locationObj._title.all)
                            : ""}
                        </h4>

                        {locationObj.text_morada?.all && (
                          <p className="location-address">
                            <strong>Endereço:</strong>{" "}
                            {locationObj.text_morada.all}
                          </p>
                        )}

                        <div className="location-links">
                          {locationObj.link_website?.all && (
                            <a
                              href={locationObj.link_website.all}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="location-link website-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Website
                            </a>
                          )}

                          {locationObj.link_google_maps?.all && (
                            <a
                              href={locationObj.link_google_maps.all}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="location-link maps-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Google Maps
                            </a>
                          )}
                        </div>

                        {locationObj.text_description?.all && (
                          <SanitizedHTML
                            html={locationObj.text_description.all}
                            className="location-description"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
